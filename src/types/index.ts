export type DrugCategory = 'antibiotic' | 'chemotherapy' | 'nutrition' | 'cardiovascular' | 'analgesic' | 'other';
export type ZoneType = 'chemo_zone' | 'nutrition_zone' | 'general_zone' | 'antibiotic_zone';
export type WorkstationType = 'biosafety_cabinet' | 'laminar_flow_bench';
export type PrescriptionStatus = 'pending_review' | 'reviewed' | 'rejected' | 'dispensing' | 'checking' | 'delivered' | 'adjustment_requested' | 'adjustment_approved';
export type OrderType = 'long_term' | 'temporary';
export type StaffRole = 'pharmacist_reviewer' | 'pharmacist_dispenser' | 'nurse' | 'director' | 'maintenance';
export type DeviceStatus = 'running' | 'idle' | 'maintenance' | 'fault';
export type MaintenanceStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Patient {
  id: string;
  name: string;
  gender: 'male' | 'female';
  age: number;
  bedNumber: string;
  department: string;
  diagnosis: string;
}

export interface Drug {
  id: string;
  name: string;
  genericName: string;
  specification: string;
  category: DrugCategory;
  unitPrice: number;
  isSpecial: boolean;
  incompatibilityList: string[];
  infusionTimeMinutes: number;
  storageRequirement?: string;
}

export interface OrderItem {
  id: string;
  drugId: string;
  drugName: string;
  dosage: string;
  frequency: string;
  administrationRoute: string;
  infusionSpeed?: number;
  remarks?: string;
}

export interface DoctorOrder {
  id: string;
  orderNo: string;
  orderType: OrderType;
  patientId: string;
  patient: Patient;
  orderingDepartment: string;
  orderingDoctor: string;
  orderTime: string;
  expectedStartTime: string;
  items: OrderItem[];
  priority: 'normal' | 'urgent' | 'emergency';
  isValid: boolean;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface Prescription {
  id: string;
  prescriptionNo: string;
  orderId: string;
  order: DoctorOrder;
  patientId: string;
  patient: Patient;
  items: OrderItem[];
  scheduleTime: string;
  expectedDuration: number;
  zoneType: ZoneType;
  workstationId: string | null;
  workstationName?: string;
  assignedPharmacistId: string | null;
  assignedPharmacistName?: string;
  status: PrescriptionStatus;
  statusHistory: {
    status: PrescriptionStatus;
    time: string;
    operator: string;
    note?: string;
  }[];
  drugConflicts: string[];
  splitFrom?: string;
  splitBatchNo?: number;
  barcode: string;
  actualStartTime?: string;
  actualEndTime?: string;
  errorRecord?: {
    foundBy: string;
    errorType: string;
    description: string;
    time: string;
  }[];
  lastAdjustment?: {
    previousWorkstationId?: string | null;
    previousWorkstationName?: string;
    previousPharmacistId?: string | null;
    previousPharmacistName?: string;
    previousScheduleTime?: string;
    requestId: string;
    approvedAt: string;
    approvedBy: string;
    reason: string;
  };
}

export interface Workstation {
  id: string;
  name: string;
  type: WorkstationType;
  zoneType: ZoneType;
  location: string;
  deviceId: string;
  currentStatus: 'idle' | 'occupied' | 'maintenance';
  currentPrescriptionId?: string | null;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  pressureDifferential: number;
  requiredPressureDifferential: number;
  utilizationRate: number;
}

export interface Staff {
  id: string;
  name: string;
  employeeNo: string;
  role: StaffRole;
  phone: string;
  isOnDuty: boolean;
  currentWorkstationId?: string | null;
  skills: ZoneType[];
  dailyDispenseCount: number;
  dailyWorkingMinutes: number;
}

export interface Device {
  id: string;
  deviceNo: string;
  name: string;
  type: 'biosafety_cabinet' | 'laminar_flow_bench' | 'pass_through' | 'clean_suit';
  model: string;
  workstationId?: string;
  status: DeviceStatus;
  accumulatedRuntimeHours: number;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  hepaFilterInstallDate: string;
  hepaFilterLifecycleHours: number;
  hepaFilterRemainingHours: number;
  maintenanceHistory: {
    date: string;
    type: 'routine' | 'repair' | 'filter_replace' | 'pressure_check';
    description: string;
    operator: string;
  }[];
  currentFault?: string;
}

export interface SparePart {
  id: string;
  name: string;
  partNo: string;
  specification: string;
  quantity: number;
  safetyStock: number;
  unit: string;
  lastRestockDate: string;
  compatibleDevices: string[];
}

export interface MaintenanceWorkOrder {
  id: string;
  workOrderNo: string;
  deviceId: string;
  deviceName: string;
  type: 'routine' | 'repair' | 'filter_replace' | 'pressure_check';
  priority: 'normal' | 'urgent' | 'emergency';
  description: string;
  status: MaintenanceStatus;
  assignedTeamId: string | null;
  assignedTeamName?: string;
  createdTime: string;
  scheduledTime: string;
  startedTime?: string;
  completedTime?: string;
  usedParts: {
    partId: string;
    partName: string;
    quantity: number;
  }[];
  remarks?: string;
  operator?: string;
}

export interface AdjustmentRequest {
  id: string;
  requestNo: string;
  prescriptionId: string;
  prescriptionNo: string;
  requesterId: string;
  requesterName: string;
  reason: string;
  proposedChanges: {
    workstationId?: string;
    pharmacistId?: string;
    scheduleTime?: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  requestedTime: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export interface QualityRecord {
  id: string;
  date: string;
  hour: number;
  drugCategory: DrugCategory;
  zoneType: ZoneType;
  dispensedCount: number;
  errorCount: number;
  errorType?: string;
  pharmacistId?: string;
  workstationId?: string;
  prescriptionNo?: string;
}

export interface DispensingRecord {
  id: string;
  prescriptionId: string;
  prescriptionNo: string;
  workstationId: string;
  pharmacistId: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  patientId: string;
  patientName: string;
  drugCount: number;
  hasError: boolean;
  errorType?: string;
}

export interface IncompatibilityRule {
  id: string;
  drugAId: string;
  drugAName: string;
  drugBId: string;
  drugBName: string;
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
  handlingSuggestion: string;
}

export interface InfusionOrderRule {
  id: string;
  firstCategory: DrugCategory;
  followCategory: DrugCategory;
  reason: string;
  minIntervalMinutes: number;
}

export interface SchedulingConfig {
  antibioticPriorityBoost: number;
  chemotherapyDelayMinutes: number;
  maxPrescriptionsPerPharmacistPerHour: number;
  estimatedMinutesPerDrugItem: number;
  unitSplitThreshold: number;
  cleanZonePressureRequired: number;
  workStartTime: string;
  workEndTime: string;
  maintenanceCheckIntervalDays: number;
  filterReplacementHours: number;
  overtimeWarningThresholdMinutes: number;
}
