import { create } from 'zustand';
import dayjs from 'dayjs';
import {
  DoctorOrder,
  Prescription,
  Workstation,
  Staff,
  Device,
  SparePart,
  MaintenanceWorkOrder,
  AdjustmentRequest,
  DispensingRecord,
  QualityRecord,
  IncompatibilityRule,
  InfusionOrderRule,
  SchedulingConfig,
  ZoneType,
  PrescriptionStatus,
} from '../types';
import {
  mockDoctorOrders,
  mockWorkstations,
  mockStaff,
  mockDevices,
  mockSpareParts,
  mockIncompatibilityRules,
  mockInfusionOrderRules,
  defaultSchedulingConfig,
  generatePrescriptions,
  generateMaintenanceWorkOrders,
  generatePrescriptionNo,
  generateBarcode,
} from '../mock/data';

interface AppState {
  orders: DoctorOrder[];
  prescriptions: Prescription[];
  workstations: Workstation[];
  staff: Staff[];
  devices: Device[];
  spareParts: SparePart[];
  maintenanceWorkOrders: MaintenanceWorkOrder[];
  adjustmentRequests: AdjustmentRequest[];
  dispensingRecords: DispensingRecord[];
  qualityRecords: QualityRecord[];
  incompatibilityRules: IncompatibilityRule[];
  infusionOrderRules: InfusionOrderRule[];
  schedulingConfig: SchedulingConfig;
  currentUserId: string;
  currentDate: string;
  notifications: { id: string; type: 'info' | 'warning' | 'error' | 'success'; message: string; time: string; read: boolean }[];

  addOrder: (order: DoctorOrder) => void;
  updateOrder: (id: string, updates: Partial<DoctorOrder>) => void;
  reviewOrder: (id: string, approved: boolean, reviewerId: string, note?: string) => void;

  generateSchedule: () => Prescription[];
  updatePrescription: (id: string, updates: Partial<Prescription>) => void;
  updatePrescriptionStatus: (id: string, status: PrescriptionStatus, operator: string, note?: string) => void;
  reviewPrescription: (id: string, approved: boolean, reviewerId: string, note?: string) => void;
  claimTask: (prescriptionId: string, pharmacistId: string) => void;
  unclaimTask: (prescriptionId: string) => void;

  requestAdjustment: (prescriptionId: string, requesterId: string, requesterName: string, reason: string, proposedChanges: AdjustmentRequest['proposedChanges']) => void;
  reviewAdjustment: (requestId: string, approved: boolean, reviewerId: string, reviewNote?: string) => void;

  createMaintenanceWorkOrder: (deviceId: string, type: MaintenanceWorkOrder['type'], priority: MaintenanceWorkOrder['priority'], description: string) => void;
  assignMaintenanceTeam: (workOrderId: string, teamId: string, teamName: string) => void;
  completeMaintenanceWorkOrder: (workOrderId: string, operatorId: string, usedParts: { partId: string; partName: string; quantity: number }[]) => void;
  checkAndGenerateMaintenanceOrders: () => void;

  updateSparePart: (id: string, updates: Partial<SparePart>) => void;
  consumeSpareParts: (parts: { partId: string; quantity: number }[]) => void;

  addDispensingRecord: (record: DispensingRecord) => void;
  addQualityRecord: (record: QualityRecord) => void;

  updateWorkstationStatus: (id: string, status: Workstation['currentStatus']) => void;
  updateDeviceRuntime: (id: string, hours: number) => void;

  addNotification: (type: 'info' | 'warning' | 'error' | 'success', message: string) => void;
  markNotificationRead: (id: string) => void;
  setCurrentUserId: (id: string) => void;

  getDashboardStats: () => {
    totalOrders: number;
    pendingReview: number;
    dispensing: number;
    completedToday: number;
    maintenancePending: number;
    lowStockCount: number;
    errorRate: number;
    avgEfficiency: number;
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  orders: mockDoctorOrders,
  prescriptions: generatePrescriptions(),
  workstations: mockWorkstations,
  staff: mockStaff,
  devices: mockDevices,
  spareParts: mockSpareParts,
  maintenanceWorkOrders: generateMaintenanceWorkOrders(),
  adjustmentRequests: [],
  dispensingRecords: [],
  qualityRecords: [],
  incompatibilityRules: mockIncompatibilityRules,
  infusionOrderRules: mockInfusionOrderRules,
  schedulingConfig: defaultSchedulingConfig,
  currentUserId: 's001',
  currentDate: dayjs().format('YYYY-MM-DD'),
  notifications: [
    { id: 'n001', type: 'warning', message: '生物安全柜 B-002 高效过滤器剩余寿命不足5%，请尽快安排更换', time: dayjs().subtract(30, 'minute').format('HH:mm'), read: false },
    { id: 'n002', type: 'error', message: '处方 CF' + dayjs().format('YYYYMMDD') + '0002 调配超时预警（已超出预计时间35分钟）', time: dayjs().subtract(15, 'minute').format('HH:mm'), read: false },
    { id: 'n003', type: 'info', message: '今日新增医嘱 8 条，待审核 5 条', time: dayjs().subtract(45, 'minute').format('HH:mm'), read: true },
    { id: 'n004', type: 'warning', message: '备件"高效过滤器(LF用)"库存低于安全库存（当前3个/安全5个）', time: dayjs().subtract(1, 'hour').format('HH:mm'), read: false },
  ],

  addOrder: (order) => set((state) => ({ orders: [order, ...state.orders] })),

  updateOrder: (id, updates) => set((state) => ({
    orders: state.orders.map((o) => (o.id === id ? { ...o, ...updates } : o)),
  })),

  reviewOrder: (id, approved, reviewerId, note) => {
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === id
          ? {
              ...o,
              reviewStatus: approved ? 'approved' : 'rejected',
              reviewedBy: reviewerId,
              reviewedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
              reviewNote: note,
            }
          : o
      ),
    }));
    get().addNotification('success', `医嘱审核${approved ? '通过' : '驳回'}: ${id}`);
  },

  generateSchedule: () => {
    const state = get();
    const approvedOrders = state.orders.filter((o) => o.reviewStatus === 'approved');
    const newPrescriptions: Prescription[] = [];

    const sortedOrders = [...approvedOrders].sort((a, b) => {
      let scoreA = dayjs(a.expectedStartTime).valueOf();
      let scoreB = dayjs(b.expectedStartTime).valueOf();
      if (a.priority === 'emergency') scoreA -= 120 * 60 * 1000;
      if (a.priority === 'urgent') scoreA -= 30 * 60 * 1000;
      if (b.priority === 'emergency') scoreB -= 120 * 60 * 1000;
      if (b.priority === 'urgent') scoreB -= 30 * 60 * 1000;

      const hasCatBoostA = a.items.some((i) => ['d001', 'd002', 'd011'].includes(i.drugId));
      const hasCatBoostB = b.items.some((i) => ['d001', 'd002', 'd011'].includes(i.drugId));
      if (hasCatBoostA) scoreA -= state.schedulingConfig.antibioticPriorityBoost * 60 * 1000;
      if (hasCatBoostB) scoreB -= state.schedulingConfig.antibioticPriorityBoost * 60 * 1000;
      const categoriesA = new Set<string>();
      const categoriesB = new Set<string>();

      return scoreA - scoreB;
    });

    const idleWorkstationsByZone: Record<ZoneType, Workstation[]> = {
      antibiotic_zone: state.workstations.filter((w) => w.zoneType === 'antibiotic_zone' && w.currentStatus === 'idle'),
      chemo_zone: state.workstations.filter((w) => w.zoneType === 'chemo_zone' && w.currentStatus === 'idle'),
      nutrition_zone: state.workstations.filter((w) => w.zoneType === 'nutrition_zone' && w.currentStatus === 'idle'),
      general_zone: state.workstations.filter((w) => w.zoneType === 'general_zone' && w.currentStatus === 'idle'),
    };

    const availableStaffByZone: Record<ZoneType, Staff[]> = {
      antibiotic_zone: state.staff.filter((s) => s.isOnDuty && s.skills.includes('antibiotic_zone') && (s.role === 'pharmacist_dispenser' || s.role === 'nurse')),
      chemo_zone: state.staff.filter((s) => s.isOnDuty && s.skills.includes('chemo_zone') && s.role === 'pharmacist_dispenser'),
      nutrition_zone: state.staff.filter((s) => s.isOnDuty && s.skills.includes('nutrition_zone') && (s.role === 'pharmacist_dispenser' || s.role === 'nurse')),
      general_zone: state.staff.filter((s) => s.isOnDuty && s.skills.includes('general_zone') && (s.role === 'pharmacist_dispenser' || s.role === 'nurse')),
    };

    let timeCursor = dayjs();
    const workstationLastUsed: Record<string, dayjs.Dayjs> = {};
    const pharmacistLastUsed: Record<string, dayjs.Dayjs> = {};

    for (const order of sortedOrders) {
      if (state.prescriptions.some((p) => p.orderId === order.id && (p.status !== 'rejected'))) {
        continue;
      }

      let zoneType: ZoneType = 'general_zone';
      const hasAntibiotic = order.items.some((item) => item.drugId.startsWith('d001') || item.drugId === 'd002' || item.drugId === 'd011');
      const hasChemo = order.items.some((item) => item.drugId === 'd003' || item.drugId === 'd004' || item.drugId === 'd012');
      const hasNutrition = order.items.some((item) => item.drugId === 'd005' || item.drugId === 'd006');

      if (hasChemo) zoneType = 'chemo_zone';
      else if (hasNutrition) zoneType = 'nutrition_zone';
      else if (hasAntibiotic) zoneType = 'antibiotic_zone';

      const conflicts: string[] = [];
      for (let i = 0; i < order.items.length; i++) {
        for (let j = i + 1; j < order.items.length; j++) {
          const rule = state.incompatibilityRules.find(
            (r) =>
              (r.drugAId === order.items[i].drugId && r.drugBId === order.items[j].drugId) ||
              (r.drugAId === order.items[j].drugId && r.drugBId === order.items[i].drugId)
          );
          if (rule) {
            conflicts.push(`${rule.drugAName} 与 ${rule.drugBName} 存在${rule.severity === 'severe' ? '严重' : rule.severity === 'moderate' ? '中度' : '轻度'}配伍禁忌: ${rule.description}`);
          }
        }
      }

      const itemCount = order.items.length;
      const estimatedDuration = itemCount * state.schedulingConfig.estimatedMinutesPerDrugItem + 10;
      const totalDosage = order.items.reduce((sum, item) => sum + (parseFloat(item.dosage) || 0), 0);
      const needSplit = totalDosage > state.schedulingConfig.unitSplitThreshold;

      const batchCount = needSplit ? Math.ceil(totalDosage / state.schedulingConfig.unitSplitThreshold) : 1;

      for (let batch = 0; batch < batchCount; batch++) {
        const availableWs = idleWorkstationsByZone[zoneType].filter(
          (w) => !workstationLastUsed[w.id] || workstationLastUsed[w.id].isBefore(timeCursor)
        );
        const availableStaff = availableStaffByZone[zoneType].filter(
          (s) => !pharmacistLastUsed[s.id] || pharmacistLastUsed[s.id].isBefore(timeCursor)
        );

        const workstation = availableWs[0] || idleWorkstationsByZone[zoneType][0] || idleWorkstationsByZone.general_zone[0];
        const pharmacist = availableStaff[0] || availableStaffByZone[zoneType][0] || availableStaffByZone.general_zone[0];

        if (workstation) workstationLastUsed[workstation.id] = timeCursor.add(estimatedDuration, 'minute');
        if (pharmacist) pharmacistLastUsed[pharmacist.id] = timeCursor.add(estimatedDuration, 'minute');

        const prescription: Prescription = {
          id: 'pr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          prescriptionNo: generatePrescriptionNo(),
          orderId: order.id,
          order: order,
          patientId: order.patientId,
          patient: order.patient,
          items: order.items,
          scheduleTime: timeCursor.format('YYYY-MM-DD HH:mm:ss'),
          expectedDuration: estimatedDuration,
          zoneType,
          workstationId: workstation?.id || null,
          workstationName: workstation?.name,
          assignedPharmacistId: pharmacist?.id || null,
          assignedPharmacistName: pharmacist?.name,
          status: 'pending_review',
          statusHistory: [
            {
              status: 'pending_review',
              time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
              operator: '系统自动排程',
            },
          ],
          drugConflicts: conflicts,
          splitFrom: needSplit ? order.id : undefined,
          splitBatchNo: needSplit ? batch + 1 : undefined,
          barcode: generateBarcode(),
          errorRecord: [],
        };

        newPrescriptions.push(prescription);
        timeCursor = timeCursor.add(Math.max(estimatedDuration / batchCount, 15), 'minute');
      }
    }

    if (newPrescriptions.length > 0) {
      set((state) => ({ prescriptions: [...newPrescriptions, ...state.prescriptions] }));
      get().addNotification('success', `智能排程完成，共生成 ${newPrescriptions.length} 条调配处方`);
    } else {
      get().addNotification('info', '没有需要排程的新医嘱');
    }

    return newPrescriptions;
  },

  updatePrescription: (id, updates) => set((state) => ({
    prescriptions: state.prescriptions.map((p) => (p.id === id ? { ...p, ...updates } : p)),
  })),

  updatePrescriptionStatus: (id, status, operator, note) => {
    set((state) => {
      const newHistory = [
        ...state.prescriptions.find((p) => p.id === id)?.statusHistory || [],
        {
          status,
          time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          operator,
          note,
        },
      ];

      let actualStartTime = state.prescriptions.find((p) => p.id === id)?.actualStartTime;
      let actualEndTime = state.prescriptions.find((p) => p.id === id)?.actualEndTime;

      if (status === 'dispensing' && !actualStartTime) {
        actualStartTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
      }
      if (status === 'delivered') {
        actualEndTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
      }

      return {
        prescriptions: state.prescriptions.map((p) =>
          p.id === id ? { ...p, status, statusHistory: newHistory, actualStartTime, actualEndTime } : p
        ),
      };
    });
  },

  reviewPrescription: (id, approved, reviewerId, note) => {
    set((state) => ({
      prescriptions: state.prescriptions.map((p) =>
        p.id === id
          ? {
              ...p,
              status: approved ? 'reviewed' : 'rejected',
              statusHistory: [
                ...p.statusHistory,
                {
                  status: approved ? 'reviewed' : 'rejected',
                  time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                  operator: reviewerId,
                  note: approved ? '审核通过' : '审核驳回: ' + note,
                },
              ],
            }
          : p
      ),
    }));
    get().addNotification('success', `处方${approved ? '审核通过' : '审核驳回'}`);
  },

  claimTask: (prescriptionId, pharmacistId) => {
    set((state) => {
      const pharmacist = state.staff.find((s) => s.id === pharmacistId);
      return {
        prescriptions: state.prescriptions.map((p) =>
          p.id === prescriptionId && p.status === 'reviewed' && !p.claimedBy
            ? {
                ...p,
                claimedBy: pharmacistId,
                claimedByName: pharmacist?.name || '',
                claimedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                statusHistory: [
                  ...p.statusHistory,
                  {
                    status: 'reviewed' as PrescriptionStatus,
                    time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                    operator: pharmacistId,
                    note: `${pharmacist?.name || pharmacistId} 领取任务`,
                  },
                ],
              }
            : p
        ),
      };
    });
    get().addNotification('info', '任务已领取');
  },

  unclaimTask: (prescriptionId) => {
    set((state) => ({
      prescriptions: state.prescriptions.map((p) =>
        p.id === prescriptionId
          ? {
              ...p,
              claimedBy: null,
              claimedByName: null,
              claimedAt: null,
            }
          : p
      ),
    }));
  },

  requestAdjustment: (prescriptionId, requesterId, requesterName, reason, proposedChanges) => {
    const request: AdjustmentRequest = {
      id: 'ar_' + Date.now(),
      requestNo: 'TZ' + dayjs().format('YYYYMMDDHHmmss'),
      prescriptionId,
      prescriptionNo: get().prescriptions.find((p) => p.id === prescriptionId)?.prescriptionNo || '',
      requesterId,
      requesterName,
      reason,
      proposedChanges,
      status: 'pending',
      requestedTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    };
    set((state) => ({ adjustmentRequests: [request, ...state.adjustmentRequests] }));

    set((state) => ({
      prescriptions: state.prescriptions.map((p) =>
        p.id === prescriptionId
          ? {
              ...p,
              status: 'adjustment_requested',
              statusHistory: [
                ...p.statusHistory,
                {
                  status: 'adjustment_requested',
                  time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                  operator: requesterName,
                  note: '申请调整: ' + reason,
                },
              ],
            }
          : p
      ),
    }));
    get().addNotification('warning', `收到新的处方调整申请: ${request.requestNo}`);
  },

  reviewAdjustment: (requestId, approved, reviewerId, reviewNote) => {
    set((state) => {
      const request = state.adjustmentRequests.find((r) => r.id === requestId);
      if (!request) return state;

      const updatedPrescriptions = state.prescriptions.map((p) => {
        if (p.id === request.prescriptionId) {
          const updates: Partial<Prescription> = {
            status: approved ? 'adjustment_approved' : p.status === 'adjustment_requested' ? 'reviewed' : p.status,
            statusHistory: [
              ...p.statusHistory,
              {
                status: approved ? 'adjustment_approved' : p.status,
                time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                operator: reviewerId,
                note: approved ? '调整申请已批准' : '调整申请被驳回: ' + reviewNote,
              },
            ],
          };
          if (approved) {
            const reviewer = state.staff.find((s) => s.id === reviewerId);
            updates.lastAdjustment = {
              previousWorkstationId: p.workstationId,
              previousWorkstationName: p.workstationName,
              previousPharmacistId: p.assignedPharmacistId,
              previousPharmacistName: p.assignedPharmacistName,
              previousScheduleTime: p.scheduleTime,
              requestId: request.id,
              approvedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
              approvedBy: reviewer?.name || reviewerId,
              reason: request.reason,
            };
          }
          if (approved && request.proposedChanges.workstationId) {
            const ws = state.workstations.find((w) => w.id === request.proposedChanges.workstationId);
            updates.workstationId = request.proposedChanges.workstationId;
            updates.workstationName = ws?.name;
            if (ws?.zoneType) {
              updates.zoneType = ws.zoneType;
            }
          }
          if (approved && request.proposedChanges.pharmacistId) {
            const st = state.staff.find((s) => s.id === request.proposedChanges.pharmacistId);
            updates.assignedPharmacistId = request.proposedChanges.pharmacistId;
            updates.assignedPharmacistName = st?.name;
            updates.claimedBy = null;
            updates.claimedByName = null;
            updates.claimedAt = null;
          }
          if (approved && request.proposedChanges.workstationId && p.claimedBy) {
            updates.claimedBy = null;
            updates.claimedByName = null;
            updates.claimedAt = null;
          }
          if (approved && request.proposedChanges.scheduleTime) {
            updates.scheduleTime = request.proposedChanges.scheduleTime;
          }
          return { ...p, ...updates };
        }
        return p;
      });

      return {
        adjustmentRequests: state.adjustmentRequests.map((r) =>
          r.id === requestId
            ? {
                ...r,
                status: approved ? 'approved' : 'rejected',
                reviewedBy: reviewerId,
                reviewedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                reviewNote,
              }
            : r
        ),
        prescriptions: updatedPrescriptions,
      };
    });
    get().addNotification('success', `调整申请审批完成: ${approved ? '已批准' : '已驳回'}`);
  },

  createMaintenanceWorkOrder: (deviceId, type, priority, description) => {
    const device = get().devices.find((d) => d.id === deviceId);
    const order: MaintenanceWorkOrder = {
      id: 'wo_' + Date.now(),
      workOrderNo: 'WB' + dayjs().format('YYYYMMDDHHmmss'),
      deviceId,
      deviceName: device?.name || '',
      type,
      priority,
      description,
      status: 'pending',
      assignedTeamId: null,
      createdTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      scheduledTime: dayjs().add(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
      usedParts: [],
    };
    set((state) => ({ maintenanceWorkOrders: [order, ...state.maintenanceWorkOrders] }));
    get().addNotification(priority === 'emergency' ? 'error' : priority === 'urgent' ? 'warning' : 'info', `新建维保工单: ${order.workOrderNo}`);
  },

  assignMaintenanceTeam: (workOrderId, teamId, teamName) => {
    set((state) => ({
      maintenanceWorkOrders: state.maintenanceWorkOrders.map((wo) =>
        wo.id === workOrderId ? { ...wo, assignedTeamId: teamId, assignedTeamName: teamName } : wo
      ),
    }));
  },

  completeMaintenanceWorkOrder: (workOrderId, operatorId, usedParts) => {
    set((state) => {
      const wo = state.maintenanceWorkOrders.find((w) => w.id === workOrderId);
      if (!wo) return state;

      const updatedDevices = state.devices.map((d) =>
        d.id === wo.deviceId
          ? {
              ...d,
              lastMaintenanceDate: dayjs().format('YYYY-MM-DD'),
              nextMaintenanceDate: dayjs().add(state.schedulingConfig.maintenanceCheckIntervalDays, 'day').format('YYYY-MM-DD'),
              status: d.status === 'maintenance' ? 'idle' : d.status,
              hepaFilterRemainingHours: wo.type === 'filter_replace' ? d.hepaFilterLifecycleHours : d.hepaFilterRemainingHours,
              hepaFilterInstallDate: wo.type === 'filter_replace' ? dayjs().format('YYYY-MM-DD') : d.hepaFilterInstallDate,
              maintenanceHistory: [
                ...d.maintenanceHistory,
                {
                  date: dayjs().format('YYYY-MM-DD'),
                  type: wo.type,
                  description: wo.description,
                  operator: operatorId,
                },
              ],
            }
          : d
      );

      return {
        maintenanceWorkOrders: state.maintenanceWorkOrders.map((w) =>
          w.id === workOrderId
            ? {
                ...w,
                status: 'completed',
                completedTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                operator: operatorId,
                usedParts,
              }
            : w
        ),
        devices: updatedDevices,
      };
    });

    if (usedParts.length > 0) {
      get().consumeSpareParts(usedParts);
    }
    get().addNotification('success', `维保工单已完成`);
  },

  checkAndGenerateMaintenanceOrders: () => {
    const state = get();
    const today = dayjs();

    state.devices.forEach((d) => {
      if (d.hepaFilterRemainingHours < d.hepaFilterLifecycleHours * 0.05) {
        const existing = state.maintenanceWorkOrders.find(
          (wo) => wo.deviceId === d.id && wo.type === 'filter_replace' && (wo.status === 'pending' || wo.status === 'in_progress')
        );
        if (!existing) {
          get().createMaintenanceWorkOrder(d.id, 'filter_replace', 'urgent', `高效过滤器剩余寿命不足5%（剩余${d.hepaFilterRemainingHours}小时），请尽快更换`);
        }
      }

      const nextDate = dayjs(d.nextMaintenanceDate);
      if (nextDate.isBefore(today) || nextDate.diff(today, 'day') <= 3) {
        const existing = state.maintenanceWorkOrders.find(
          (wo) => wo.deviceId === d.id && wo.type === 'routine' && (wo.status === 'pending' || wo.status === 'in_progress')
        );
        if (!existing) {
          get().createMaintenanceWorkOrder(d.id, 'routine', 'normal', `到例行维护周期，剩余${Math.max(0, nextDate.diff(today, 'day'))}天`);
        }
      }

      state.workstations.forEach((ws) => {
        if (ws.pressureDifferential < ws.requiredPressureDifferential - 2) {
          const existing = state.maintenanceWorkOrders.find(
            (wo) => wo.deviceId === ws.deviceId && wo.type === 'pressure_check' && (wo.status === 'pending' || wo.status === 'in_progress')
          );
          if (!existing) {
            get().createMaintenanceWorkOrder(ws.deviceId, 'pressure_check', 'normal', `洁净区压差异常（当前${ws.pressureDifferential}Pa/要求${ws.requiredPressureDifferential}Pa）`);
          }
        }
      });
    });
  },

  updateSparePart: (id, updates) => set((state) => ({
    spareParts: state.spareParts.map((sp) => (sp.id === id ? { ...sp, ...updates } : sp)),
  })),

  consumeSpareParts: (parts) => {
    set((state) => {
      const updatedParts = state.spareParts.map((sp) => {
        const consumed = parts.find((p) => p.partId === sp.id);
        if (consumed) {
          const newQty = Math.max(0, sp.quantity - consumed.quantity);
          if (newQty < sp.safetyStock) {
            get().addNotification('warning', `备件库存预警: ${sp.name} 剩余${newQty}${sp.unit}，低于安全库存${sp.safetyStock}${sp.unit}`);
          }
          return { ...sp, quantity: newQty };
        }
        return sp;
      });
      return { spareParts: updatedParts };
    });
  },

  addDispensingRecord: (record) => set((state) => ({ dispensingRecords: [record, ...state.dispensingRecords] })),

  addQualityRecord: (record) => set((state) => ({ qualityRecords: [record, ...state.qualityRecords] })),

  updateWorkstationStatus: (id, status) => set((state) => ({
    workstations: state.workstations.map((w) => (w.id === id ? { ...w, currentStatus: status } : w)),
  })),

  updateDeviceRuntime: (id, hours) => set((state) => ({
    devices: state.devices.map((d) =>
      d.id === id
        ? {
            ...d,
            accumulatedRuntimeHours: d.accumulatedRuntimeHours + hours,
            hepaFilterRemainingHours: Math.max(0, d.hepaFilterRemainingHours - hours),
          }
        : d
    ),
  })),

  addNotification: (type, message) => set((state) => ({
    notifications: [
      {
        id: 'n_' + Date.now(),
        type,
        message,
        time: dayjs().format('HH:mm'),
        read: false,
      },
      ...state.notifications,
    ],
  })),

  markNotificationRead: (id) => set((state) => ({
    notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
  })),

  setCurrentUserId: (id) => set({ currentUserId: id }),

  getDashboardStats: () => {
    const state = get();
    const today = dayjs().format('YYYY-MM-DD');
    const todayPrescriptions = state.prescriptions.filter((p) => p.scheduleTime.startsWith(today));
    const totalOrders = state.orders.length;
    const pendingReview = state.prescriptions.filter((p) => p.status === 'pending_review').length;
    const dispensing = state.prescriptions.filter((p) => p.status === 'dispensing').length;
    const completedToday = state.prescriptions.filter((p) => p.status === 'delivered' && (p.actualEndTime || '').startsWith(today)).length;
    const maintenancePending = state.maintenanceWorkOrders.filter((wo) => wo.status === 'pending' || wo.status === 'in_progress').length;
    const lowStockCount = state.spareParts.filter((sp) => sp.quantity < sp.safetyStock).length;

    const totalDispensed = todayPrescriptions.filter((p) => ['checking', 'delivered'].includes(p.status)).length;
    const totalErrors = todayPrescriptions.filter((p) => p.errorRecord && p.errorRecord.length > 0).length;
    const errorRate = totalDispensed > 0 ? (totalErrors / totalDispensed) * 100 : 0;

    const onDutyDispensers = state.staff.filter((s) => s.isOnDuty && (s.role === 'pharmacist_dispenser' || s.role === 'nurse'));
    const totalDailyCount = onDutyDispensers.reduce((sum, s) => sum + s.dailyDispenseCount, 0);
    const avgEfficiency = onDutyDispensers.length > 0 ? totalDailyCount / onDutyDispensers.length : 0;

    return {
      totalOrders,
      pendingReview,
      dispensing,
      completedToday,
      maintenancePending,
      lowStockCount,
      errorRate: parseFloat(errorRate.toFixed(2)),
      avgEfficiency: parseFloat(avgEfficiency.toFixed(1)),
    };
  },
}));
