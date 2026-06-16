import {
  Drug,
  Patient,
  DoctorOrder,
  Workstation,
  Staff,
  Device,
  SparePart,
  IncompatibilityRule,
  InfusionOrderRule,
  SchedulingConfig,
  MaintenanceWorkOrder,
  Prescription,
} from '../types';
import dayjs from 'dayjs';

export const mockDrugs: Drug[] = [
  { id: 'd001', name: '注射用头孢曲松钠', genericName: '头孢曲松', specification: '1.0g/支', category: 'antibiotic', unitPrice: 45.5, isSpecial: false, incompatibilityList: ['d005', 'd008'], infusionTimeMinutes: 60, storageRequirement: '2~8℃冷藏' },
  { id: 'd002', name: '注射用青霉素钠', genericName: '青霉素', specification: '80万IU/支', category: 'antibiotic', unitPrice: 2.5, isSpecial: false, incompatibilityList: ['d003', 'd007'], infusionTimeMinutes: 45 },
  { id: 'd003', name: '注射用盐酸表柔比星', genericName: '表柔比星', specification: '10mg/支', category: 'chemotherapy', unitPrice: 280, isSpecial: true, incompatibilityList: ['d002', 'd004'], infusionTimeMinutes: 120, storageRequirement: '2~8℃冷藏避光' },
  { id: 'd004', name: '注射用顺铂', genericName: '顺铂', specification: '30mg/支', category: 'chemotherapy', unitPrice: 65, isSpecial: true, incompatibilityList: ['d003', 'd006'], infusionTimeMinutes: 180, storageRequirement: '室温避光' },
  { id: 'd005', name: '复方氨基酸注射液(18AA)', genericName: '复方氨基酸', specification: '500ml/袋', category: 'nutrition', unitPrice: 88, isSpecial: false, incompatibilityList: ['d001'], infusionTimeMinutes: 240 },
  { id: 'd006', name: '脂肪乳注射液(C14~24)', genericName: '脂肪乳', specification: '250ml/袋', category: 'nutrition', unitPrice: 120, isSpecial: false, incompatibilityList: ['d004', 'd008'], infusionTimeMinutes: 300, storageRequirement: '2~25℃保存' },
  { id: 'd007', name: '0.9%氯化钠注射液', genericName: '生理盐水', specification: '500ml/袋', category: 'other', unitPrice: 4.5, isSpecial: false, incompatibilityList: [], infusionTimeMinutes: 120 },
  { id: 'd008', name: '5%葡萄糖注射液', genericName: '葡萄糖', specification: '500ml/袋', category: 'other', unitPrice: 5.5, isSpecial: false, incompatibilityList: ['d001', 'd006'], infusionTimeMinutes: 120 },
  { id: 'd009', name: '注射用奥美拉唑钠', genericName: '奥美拉唑', specification: '40mg/支', category: 'cardiovascular', unitPrice: 55, isSpecial: false, incompatibilityList: [], infusionTimeMinutes: 60 },
  { id: 'd010', name: '注射用盐酸氨溴索', genericName: '氨溴索', specification: '30mg/支', category: 'other', unitPrice: 35, isSpecial: false, incompatibilityList: [], infusionTimeMinutes: 45 },
  { id: 'd011', name: '注射用亚胺培南西司他丁钠', genericName: '亚胺培南', specification: '1.0g/支', category: 'antibiotic', unitPrice: 320, isSpecial: false, incompatibilityList: [], infusionTimeMinutes: 90 },
  { id: 'd012', name: '注射用紫杉醇脂质体', genericName: '紫杉醇', specification: '30mg/支', category: 'chemotherapy', unitPrice: 680, isSpecial: true, incompatibilityList: ['d003'], infusionTimeMinutes: 240, storageRequirement: '2~8℃冷藏' },
];

export const mockPatients: Patient[] = [
  { id: 'p001', name: '张三', gender: 'male', age: 65, bedNumber: '住院部A-301-1', department: '呼吸内科', diagnosis: '肺部感染、慢性阻塞性肺疾病' },
  { id: 'p002', name: '李四', gender: 'female', age: 52, bedNumber: '住院部B-205-3', department: '肿瘤科', diagnosis: '乳腺癌术后化疗' },
  { id: 'p003', name: '王五', gender: 'male', age: 72, bedNumber: '住院部C-412-2', department: '心血管内科', diagnosis: '冠心病、心力衰竭' },
  { id: 'p004', name: '赵六', gender: 'female', age: 45, bedNumber: '住院部A-308-1', department: '胃肠外科', diagnosis: '胃癌术后、营养不良' },
  { id: 'p005', name: '陈七', gender: 'male', age: 58, bedNumber: '住院部B-115-2', department: '肿瘤科', diagnosis: '肺癌化疗中' },
  { id: 'p006', name: '周八', gender: 'female', age: 38, bedNumber: '住院部D-220-1', department: '普外科', diagnosis: '术后肠外营养支持' },
  { id: 'p007', name: '吴九', gender: 'male', age: 69, bedNumber: '住院部A-401-2', department: '重症医学科', diagnosis: '重度感染、多器官功能支持' },
  { id: 'p008', name: '郑十', gender: 'female', age: 55, bedNumber: '住院部B-310-1', department: '肿瘤科', diagnosis: '卵巢癌化疗' },
];

const now = dayjs();

export const mockDoctorOrders: DoctorOrder[] = [
  {
    id: 'o001',
    orderNo: 'YZ202501150001',
    orderType: 'long_term',
    patientId: 'p001',
    patient: mockPatients[0],
    orderingDepartment: '呼吸内科',
    orderingDoctor: '李主任医师',
    orderTime: now.subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    expectedStartTime: now.add(30, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    items: [
      { id: 'oi001', drugId: 'd001', drugName: '注射用头孢曲松钠', dosage: '2.0g', frequency: '每日一次', administrationRoute: '静脉滴注', infusionSpeed: 60 },
      { id: 'oi002', drugId: 'd007', drugName: '0.9%氯化钠注射液', dosage: '250ml', frequency: '每日一次', administrationRoute: '静脉滴注' },
    ],
    priority: 'urgent',
    isValid: true,
    reviewStatus: 'approved',
  },
  {
    id: 'o002',
    orderNo: 'YZ202501150002',
    orderType: 'long_term',
    patientId: 'p002',
    patient: mockPatients[1],
    orderingDepartment: '肿瘤科',
    orderingDoctor: '王副主任医师',
    orderTime: now.subtract(4, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    expectedStartTime: now.add(120, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    items: [
      { id: 'oi003', drugId: 'd003', drugName: '注射用盐酸表柔比星', dosage: '80mg', frequency: '21天为一周期', administrationRoute: '静脉滴注', infusionSpeed: 30 },
      { id: 'oi004', drugId: 'd008', drugName: '5%葡萄糖注射液', dosage: '500ml', frequency: '21天为一周期', administrationRoute: '静脉滴注' },
    ],
    priority: 'normal',
    isValid: true,
    reviewStatus: 'approved',
  },
  {
    id: 'o003',
    orderNo: 'YZ202501150003',
    orderType: 'temporary',
    patientId: 'p004',
    patient: mockPatients[3],
    orderingDepartment: '胃肠外科',
    orderingDoctor: '张主治医师',
    orderTime: now.subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    expectedStartTime: now.add(60, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    items: [
      { id: 'oi005', drugId: 'd005', drugName: '复方氨基酸注射液(18AA)', dosage: '500ml', frequency: '立即执行', administrationRoute: '静脉滴注', infusionSpeed: 40 },
      { id: 'oi006', drugId: 'd006', drugName: '脂肪乳注射液(C14~24)', dosage: '250ml', frequency: '立即执行', administrationRoute: '静脉滴注' },
    ],
    priority: 'urgent',
    isValid: true,
    reviewStatus: 'approved',
  },
  {
    id: 'o004',
    orderNo: 'YZ202501150004',
    orderType: 'long_term',
    patientId: 'p005',
    patient: mockPatients[4],
    orderingDepartment: '肿瘤科',
    orderingDoctor: '刘主任医师',
    orderTime: now.subtract(5, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    expectedStartTime: now.add(180, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    items: [
      { id: 'oi007', drugId: 'd004', drugName: '注射用顺铂', dosage: '60mg', frequency: '21天为一周期', administrationRoute: '静脉滴注', infusionSpeed: 20 },
      { id: 'oi008', drugId: 'd007', drugName: '0.9%氯化钠注射液', dosage: '500ml', frequency: '21天为一周期', administrationRoute: '静脉滴注' },
    ],
    priority: 'normal',
    isValid: true,
    reviewStatus: 'pending',
  },
  {
    id: 'o005',
    orderNo: 'YZ202501150005',
    orderType: 'temporary',
    patientId: 'p007',
    patient: mockPatients[6],
    orderingDepartment: '重症医学科',
    orderingDoctor: '陈主任',
    orderTime: now.subtract(30, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    expectedStartTime: now.add(10, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    items: [
      { id: 'oi009', drugId: 'd011', drugName: '注射用亚胺培南西司他丁钠', dosage: '1.0g', frequency: 'q8h', administrationRoute: '静脉滴注', infusionSpeed: 50 },
      { id: 'oi010', drugId: 'd007', drugName: '0.9%氯化钠注射液', dosage: '100ml', frequency: 'q8h', administrationRoute: '静脉滴注' },
    ],
    priority: 'emergency',
    isValid: true,
    reviewStatus: 'pending',
  },
  {
    id: 'o006',
    orderNo: 'YZ202501150006',
    orderType: 'long_term',
    patientId: 'p003',
    patient: mockPatients[2],
    orderingDepartment: '心血管内科',
    orderingDoctor: '赵副主任',
    orderTime: now.subtract(3, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    expectedStartTime: now.add(45, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    items: [
      { id: 'oi011', drugId: 'd009', drugName: '注射用奥美拉唑钠', dosage: '40mg', frequency: '每日二次', administrationRoute: '静脉滴注', infusionSpeed: 45 },
      { id: 'oi012', drugId: 'd008', drugName: '5%葡萄糖注射液', dosage: '100ml', frequency: '每日二次', administrationRoute: '静脉滴注' },
    ],
    priority: 'normal',
    isValid: true,
    reviewStatus: 'pending',
  },
  {
    id: 'o007',
    orderNo: 'YZ202501150007',
    orderType: 'long_term',
    patientId: 'p008',
    patient: mockPatients[7],
    orderingDepartment: '肿瘤科',
    orderingDoctor: '孙主任医师',
    orderTime: now.subtract(6, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    expectedStartTime: now.add(240, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    items: [
      { id: 'oi013', drugId: 'd012', drugName: '注射用紫杉醇脂质体', dosage: '175mg/㎡', frequency: '21天为一周期', administrationRoute: '静脉滴注', infusionSpeed: 25 },
      { id: 'oi014', drugId: 'd008', drugName: '5%葡萄糖注射液', dosage: '500ml', frequency: '21天为一周期', administrationRoute: '静脉滴注' },
    ],
    priority: 'normal',
    isValid: true,
    reviewStatus: 'pending',
  },
  {
    id: 'o008',
    orderNo: 'YZ202501150008',
    orderType: 'temporary',
    patientId: 'p006',
    patient: mockPatients[5],
    orderingDepartment: '普外科',
    orderingDoctor: '钱副主任',
    orderTime: now.subtract(45, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    expectedStartTime: now.add(90, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    items: [
      { id: 'oi015', drugId: 'd005', drugName: '复方氨基酸注射液(18AA)', dosage: '500ml', frequency: '每日一次', administrationRoute: '静脉滴注', infusionSpeed: 35 },
      { id: 'oi016', drugId: 'd006', drugName: '脂肪乳注射液(C14~24)', dosage: '500ml', frequency: '每日一次', administrationRoute: '静脉滴注' },
      { id: 'oi017', drugId: 'd010', drugName: '注射用盐酸氨溴索', dosage: '90mg', frequency: '每日一次', administrationRoute: '静脉滴注' },
    ],
    priority: 'normal',
    isValid: true,
    reviewStatus: 'pending',
  },
];

export const mockWorkstations: Workstation[] = [
  { id: 'w001', name: '抗生素区-BSC-01', type: 'biosafety_cabinet', zoneType: 'antibiotic_zone', location: '洁净区A-1', deviceId: 'dev001', currentStatus: 'idle', positionX: 50, positionY: 50, width: 120, height: 70, pressureDifferential: 15, requiredPressureDifferential: 10, utilizationRate: 0.72 },
  { id: 'w002', name: '抗生素区-BSC-02', type: 'biosafety_cabinet', zoneType: 'antibiotic_zone', location: '洁净区A-2', deviceId: 'dev002', currentStatus: 'occupied', positionX: 180, positionY: 50, width: 120, height: 70, pressureDifferential: 14, requiredPressureDifferential: 10, utilizationRate: 0.85 },
  { id: 'w003', name: '化疗区-BSC-01', type: 'biosafety_cabinet', zoneType: 'chemo_zone', location: '洁净区B-1', deviceId: 'dev003', currentStatus: 'idle', positionX: 50, positionY: 150, width: 120, height: 70, pressureDifferential: 18, requiredPressureDifferential: 15, utilizationRate: 0.68 },
  { id: 'w004', name: '化疗区-BSC-02', type: 'biosafety_cabinet', zoneType: 'chemo_zone', location: '洁净区B-2', deviceId: 'dev004', currentStatus: 'maintenance', positionX: 180, positionY: 150, width: 120, height: 70, pressureDifferential: 17, requiredPressureDifferential: 15, utilizationRate: 0.55 },
  { id: 'w005', name: '化疗区-BSC-03', type: 'biosafety_cabinet', zoneType: 'chemo_zone', location: '洁净区B-3', deviceId: 'dev005', currentStatus: 'idle', positionX: 310, positionY: 150, width: 120, height: 70, pressureDifferential: 16, requiredPressureDifferential: 15, utilizationRate: 0.78 },
  { id: 'w006', name: '营养区-LF-01', type: 'laminar_flow_bench', zoneType: 'nutrition_zone', location: '洁净区C-1', deviceId: 'dev006', currentStatus: 'idle', positionX: 50, positionY: 250, width: 120, height: 70, pressureDifferential: 12, requiredPressureDifferential: 10, utilizationRate: 0.82 },
  { id: 'w007', name: '营养区-LF-02', type: 'laminar_flow_bench', zoneType: 'nutrition_zone', location: '洁净区C-2', deviceId: 'dev007', currentStatus: 'occupied', positionX: 180, positionY: 250, width: 120, height: 70, pressureDifferential: 13, requiredPressureDifferential: 10, utilizationRate: 0.91 },
  { id: 'w008', name: '普通区-LF-01', type: 'laminar_flow_bench', zoneType: 'general_zone', location: '洁净区D-1', deviceId: 'dev008', currentStatus: 'idle', positionX: 50, positionY: 350, width: 120, height: 70, pressureDifferential: 11, requiredPressureDifferential: 8, utilizationRate: 0.63 },
  { id: 'w009', name: '普通区-LF-02', type: 'laminar_flow_bench', zoneType: 'general_zone', location: '洁净区D-2', deviceId: 'dev009', currentStatus: 'idle', positionX: 180, positionY: 350, width: 120, height: 70, pressureDifferential: 12, requiredPressureDifferential: 8, utilizationRate: 0.75 },
  { id: 'w010', name: '普通区-LF-03', type: 'laminar_flow_bench', zoneType: 'general_zone', location: '洁净区D-3', deviceId: 'dev010', currentStatus: 'idle', positionX: 310, positionY: 350, width: 120, height: 70, pressureDifferential: 11, requiredPressureDifferential: 8, utilizationRate: 0.67 },
];

export const mockStaff: Staff[] = [
  { id: 's001', name: '王药师', employeeNo: 'PH2023001', role: 'pharmacist_reviewer', phone: '13800138001', isOnDuty: true, skills: ['antibiotic_zone', 'chemo_zone', 'nutrition_zone', 'general_zone'], dailyDispenseCount: 0, dailyWorkingMinutes: 0 },
  { id: 's002', name: '李药师', employeeNo: 'PH2023002', role: 'pharmacist_reviewer', phone: '13800138002', isOnDuty: true, skills: ['antibiotic_zone', 'general_zone'], dailyDispenseCount: 0, dailyWorkingMinutes: 0 },
  { id: 's003', name: '张药师', employeeNo: 'PH2022015', role: 'pharmacist_dispenser', phone: '13800138003', isOnDuty: true, skills: ['antibiotic_zone', 'general_zone'], dailyDispenseCount: 38, dailyWorkingMinutes: 320 },
  { id: 's004', name: '刘药师', employeeNo: 'PH2022020', role: 'pharmacist_dispenser', phone: '13800138004', isOnDuty: true, skills: ['chemo_zone'], dailyDispenseCount: 22, dailyWorkingMinutes: 410 },
  { id: 's005', name: '陈药师', employeeNo: 'PH2021008', role: 'pharmacist_dispenser', phone: '13800138005', isOnDuty: true, skills: ['nutrition_zone', 'general_zone'], dailyDispenseCount: 28, dailyWorkingMinutes: 365 },
  { id: 's006', name: '赵护士', employeeNo: 'N2022033', role: 'nurse', phone: '13800138006', isOnDuty: true, skills: ['antibiotic_zone', 'nutrition_zone', 'general_zone'], dailyDispenseCount: 15, dailyWorkingMinutes: 280 },
  { id: 's007', name: '孙主任', employeeNo: 'PH2018001', role: 'director', phone: '13800138007', isOnDuty: true, skills: ['antibiotic_zone', 'chemo_zone', 'nutrition_zone', 'general_zone'], dailyDispenseCount: 5, dailyWorkingMinutes: 120 },
  { id: 's008', name: '周工', employeeNo: 'MT2021002', role: 'maintenance', phone: '13800138008', isOnDuty: true, skills: [], dailyDispenseCount: 0, dailyWorkingMinutes: 200 },
];

export const mockDevices: Device[] = [
  { id: 'dev001', deviceNo: 'BSC-A-001', name: '生物安全柜 A-001', type: 'biosafety_cabinet', model: 'BSC-1300IIA2', workstationId: 'w001', status: 'running', accumulatedRuntimeHours: 4520, lastMaintenanceDate: now.subtract(45, 'day').format('YYYY-MM-DD'), nextMaintenanceDate: now.add(15, 'day').format('YYYY-MM-DD'), hepaFilterInstallDate: now.subtract(8, 'month').format('YYYY-MM-DD'), hepaFilterLifecycleHours: 8000, hepaFilterRemainingHours: 3480, maintenanceHistory: [] },
  { id: 'dev002', deviceNo: 'BSC-A-002', name: '生物安全柜 A-002', type: 'biosafety_cabinet', model: 'BSC-1300IIA2', workstationId: 'w002', status: 'running', accumulatedRuntimeHours: 5180, lastMaintenanceDate: now.subtract(55, 'day').format('YYYY-MM-DD'), nextMaintenanceDate: now.add(5, 'day').format('YYYY-MM-DD'), hepaFilterInstallDate: now.subtract(10, 'month').format('YYYY-MM-DD'), hepaFilterLifecycleHours: 8000, hepaFilterRemainingHours: 2820, maintenanceHistory: [] },
  { id: 'dev003', deviceNo: 'BSC-B-001', name: '生物安全柜 B-001', type: 'biosafety_cabinet', model: 'BSC-1500IIB2', workstationId: 'w003', status: 'running', accumulatedRuntimeHours: 3890, lastMaintenanceDate: now.subtract(30, 'day').format('YYYY-MM-DD'), nextMaintenanceDate: now.add(30, 'day').format('YYYY-MM-DD'), hepaFilterInstallDate: now.subtract(6, 'month').format('YYYY-MM-DD'), hepaFilterLifecycleHours: 8000, hepaFilterRemainingHours: 4110, maintenanceHistory: [] },
  { id: 'dev004', deviceNo: 'BSC-B-002', name: '生物安全柜 B-002', type: 'biosafety_cabinet', model: 'BSC-1500IIB2', workstationId: 'w004', status: 'maintenance', accumulatedRuntimeHours: 7650, lastMaintenanceDate: now.subtract(80, 'day').format('YYYY-MM-DD'), nextMaintenanceDate: now.subtract(10, 'day').format('YYYY-MM-DD'), hepaFilterInstallDate: now.subtract(18, 'month').format('YYYY-MM-DD'), hepaFilterLifecycleHours: 8000, hepaFilterRemainingHours: 350, maintenanceHistory: [] },
  { id: 'dev005', deviceNo: 'BSC-B-003', name: '生物安全柜 B-003', type: 'biosafety_cabinet', model: 'BSC-1500IIB2', workstationId: 'w005', status: 'idle', accumulatedRuntimeHours: 4120, lastMaintenanceDate: now.subtract(35, 'day').format('YYYY-MM-DD'), nextMaintenanceDate: now.add(25, 'day').format('YYYY-MM-DD'), hepaFilterInstallDate: now.subtract(7, 'month').format('YYYY-MM-DD'), hepaFilterLifecycleHours: 8000, hepaFilterRemainingHours: 3880, maintenanceHistory: [] },
  { id: 'dev006', deviceNo: 'LF-C-001', name: '层流洁净台 C-001', type: 'laminar_flow_bench', model: 'SW-CJ-2FD', workstationId: 'w006', status: 'running', accumulatedRuntimeHours: 6230, lastMaintenanceDate: now.subtract(60, 'day').format('YYYY-MM-DD'), nextMaintenanceDate: now.add(0, 'day').format('YYYY-MM-DD'), hepaFilterInstallDate: now.subtract(14, 'month').format('YYYY-MM-DD'), hepaFilterLifecycleHours: 10000, hepaFilterRemainingHours: 3770, maintenanceHistory: [] },
  { id: 'dev007', deviceNo: 'LF-C-002', name: '层流洁净台 C-002', type: 'laminar_flow_bench', model: 'SW-CJ-2FD', workstationId: 'w007', status: 'running', accumulatedRuntimeHours: 5890, lastMaintenanceDate: now.subtract(50, 'day').format('YYYY-MM-DD'), nextMaintenanceDate: now.add(10, 'day').format('YYYY-MM-DD'), hepaFilterInstallDate: now.subtract(12, 'month').format('YYYY-MM-DD'), hepaFilterLifecycleHours: 10000, hepaFilterRemainingHours: 4110, maintenanceHistory: [] },
  { id: 'dev008', deviceNo: 'LF-D-001', name: '层流洁净台 D-001', type: 'laminar_flow_bench', model: 'SW-CJ-1FD', workstationId: 'w008', status: 'idle', accumulatedRuntimeHours: 3210, lastMaintenanceDate: now.subtract(25, 'day').format('YYYY-MM-DD'), nextMaintenanceDate: now.add(35, 'day').format('YYYY-MM-DD'), hepaFilterInstallDate: now.subtract(5, 'month').format('YYYY-MM-DD'), hepaFilterLifecycleHours: 10000, hepaFilterRemainingHours: 6790, maintenanceHistory: [] },
  { id: 'dev009', deviceNo: 'LF-D-002', name: '层流洁净台 D-002', type: 'laminar_flow_bench', model: 'SW-CJ-1FD', workstationId: 'w009', status: 'idle', accumulatedRuntimeHours: 4580, lastMaintenanceDate: now.subtract(40, 'day').format('YYYY-MM-DD'), nextMaintenanceDate: now.add(20, 'day').format('YYYY-MM-DD'), hepaFilterInstallDate: now.subtract(9, 'month').format('YYYY-MM-DD'), hepaFilterLifecycleHours: 10000, hepaFilterRemainingHours: 5420, maintenanceHistory: [] },
  { id: 'dev010', deviceNo: 'LF-D-003', name: '层流洁净台 D-003', type: 'laminar_flow_bench', model: 'SW-CJ-1FD', workstationId: 'w010', status: 'idle', accumulatedRuntimeHours: 3940, lastMaintenanceDate: now.subtract(28, 'day').format('YYYY-MM-DD'), nextMaintenanceDate: now.add(32, 'day').format('YYYY-MM-DD'), hepaFilterInstallDate: now.subtract(6, 'month').format('YYYY-MM-DD'), hepaFilterLifecycleHours: 10000, hepaFilterRemainingHours: 6060, maintenanceHistory: [] },
];

export const mockSpareParts: SparePart[] = [
  { id: 'sp001', name: '高效过滤器(BSC用)', partNo: 'HEPA-BSC-1300', specification: '1300×600×69mm', quantity: 6, safetyStock: 5, unit: '个', lastRestockDate: now.subtract(20, 'day').format('YYYY-MM-DD'), compatibleDevices: ['biosafety_cabinet'] },
  { id: 'sp002', name: '高效过滤器(LF用)', partNo: 'HEPA-LF-1200', specification: '1200×600×69mm', quantity: 3, safetyStock: 5, unit: '个', lastRestockDate: now.subtract(45, 'day').format('YYYY-MM-DD'), compatibleDevices: ['laminar_flow_bench'] },
  { id: 'sp003', name: '紫外杀菌灯', partNo: 'UV-30W', specification: '30W/894mm', quantity: 12, safetyStock: 10, unit: '支', lastRestockDate: now.subtract(15, 'day').format('YYYY-MM-DD'), compatibleDevices: ['biosafety_cabinet', 'laminar_flow_bench'] },
  { id: 'sp004', name: '压力传感器', partNo: 'SEN-P-01', specification: '0~100Pa', quantity: 8, safetyStock: 5, unit: '个', lastRestockDate: now.subtract(30, 'day').format('YYYY-MM-DD'), compatibleDevices: ['biosafety_cabinet', 'laminar_flow_bench'] },
  { id: 'sp005', name: '风机电机', partNo: 'FAN-M-220', specification: '220V/180W', quantity: 2, safetyStock: 3, unit: '台', lastRestockDate: now.subtract(60, 'day').format('YYYY-MM-DD'), compatibleDevices: ['biosafety_cabinet', 'laminar_flow_bench'] },
  { id: 'sp006', name: '玻璃操作窗密封条', partNo: 'SEAL-G-01', specification: '定制款', quantity: 15, safetyStock: 10, unit: '条', lastRestockDate: now.subtract(10, 'day').format('YYYY-MM-DD'), compatibleDevices: ['biosafety_cabinet', 'laminar_flow_bench'] },
];

export const mockIncompatibilityRules: IncompatibilityRule[] = [
  { id: 'inc001', drugAId: 'd001', drugAName: '注射用头孢曲松钠', drugBId: 'd005', drugBName: '复方氨基酸注射液(18AA)', severity: 'severe', description: '头孢曲松与氨基酸溶液混合可能产生沉淀反应', handlingSuggestion: '禁止混合配制，使用不同输液通路或间隔冲管' },
  { id: 'inc002', drugAId: 'd001', drugAName: '注射用头孢曲松钠', drugBId: 'd008', drugBName: '5%葡萄糖注射液', severity: 'moderate', description: '头孢曲松在酸性环境中稳定性下降', handlingSuggestion: '建议使用生理盐水作为溶媒，如必须使用葡萄糖应尽快输注' },
  { id: 'inc003', drugAId: 'd003', drugAName: '注射用盐酸表柔比星', drugBId: 'd012', drugBName: '注射用紫杉醇脂质体', severity: 'severe', description: '两种化疗药物联用可能增加心脏毒性风险', handlingSuggestion: '避免同日使用，需间隔至少48小时' },
  { id: 'inc004', drugAId: 'd005', drugAName: '复方氨基酸注射液(18AA)', drugBId: 'd006', drugBName: '脂肪乳注射液(C14~24)', severity: 'mild', description: '营养液混合配制需注意渗透压及相容性', handlingSuggestion: '可使用三腔袋或在严格无菌操作下序贯混合' },
  { id: 'inc005', drugAId: 'd003', drugAName: '注射用盐酸表柔比星', drugBId: 'd002', drugBName: '注射用青霉素钠', severity: 'moderate', description: '表柔比星与青霉素存在配伍禁忌', handlingSuggestion: '分开配制，使用不同输液管路' },
];

export const mockInfusionOrderRules: InfusionOrderRule[] = [
  { id: 'ior001', firstCategory: 'antibiotic', followCategory: 'chemotherapy', reason: '抗生素需优先使用以控制感染，降低化疗期间感染风险', minIntervalMinutes: 60 },
  { id: 'ior002', firstCategory: 'antibiotic', followCategory: 'nutrition', reason: '抗生素优先使用以达到有效血药浓度', minIntervalMinutes: 30 },
  { id: 'ior003', firstCategory: 'antibiotic', followCategory: 'other', reason: '按时间依赖性抗生素给药原则优先安排', minIntervalMinutes: 0 },
  { id: 'ior004', firstCategory: 'cardiovascular', followCategory: 'chemotherapy', reason: '维持心血管系统稳定后再进行化疗', minIntervalMinutes: 30 },
  { id: 'ior005', firstCategory: 'nutrition', followCategory: 'chemotherapy', reason: '先营养支持改善患者状态后再进行化疗', minIntervalMinutes: 120 },
  { id: 'ior006', firstCategory: 'other', followCategory: 'chemotherapy', reason: '基础用药完成后再进行刺激性化疗药物输注', minIntervalMinutes: 60 },
];

export const defaultSchedulingConfig: SchedulingConfig = {
  antibioticPriorityBoost: 60,
  chemotherapyDelayMinutes: 120,
  maxPrescriptionsPerPharmacistPerHour: 4,
  estimatedMinutesPerDrugItem: 8,
  unitSplitThreshold: 500,
  cleanZonePressureRequired: 10,
  workStartTime: '07:30',
  workEndTime: '22:00',
  maintenanceCheckIntervalDays: 30,
  filterReplacementHours: 8000,
  overtimeWarningThresholdMinutes: 30,
};

const determineZoneTypeByOrder = (order: DoctorOrder): 'antibiotic_zone' | 'chemo_zone' | 'nutrition_zone' | 'general_zone' => {
  const drugIds = order.items.map((i) => i.drugId);
  const categories = drugIds.map((id) => mockDrugs.find((d) => d.id === id)?.category || 'other');
  if (categories.includes('chemotherapy')) return 'chemo_zone';
  if (categories.includes('nutrition')) return 'nutrition_zone';
  if (categories.includes('antibiotic')) return 'antibiotic_zone';
  return 'general_zone';
};

const pickWorkstationByZone = (zone: 'antibiotic_zone' | 'chemo_zone' | 'nutrition_zone' | 'general_zone') => {
  const pool = mockWorkstations.filter((w) => w.zoneType === zone && w.currentStatus !== 'maintenance');
  return pool[0] || mockWorkstations[0];
};

const pickPharmacistByZone = (zone: 'antibiotic_zone' | 'chemo_zone' | 'nutrition_zone' | 'general_zone') => {
  const pool = mockStaff.filter((s) => s.role === 'pharmacist_dispenser' && s.skills.includes(zone) && s.isOnDuty);
  return pool[0] || mockStaff[2];
};

export const generatePrescriptionNo = () => {
  return 'CF' + now.format('YYYYMMDD') + String(Math.floor(Math.random() * 10000)).padStart(4, '0');
};

export const generateBarcode = () => {
  return 'BC' + Date.now() + String(Math.floor(Math.random() * 1000));
};

export const generatePrescriptions = (): Prescription[] => {
  const approvedOrders = mockDoctorOrders.filter((o) => o.reviewStatus === 'approved');
  return approvedOrders.map((order, idx) => {
    const zoneType = determineZoneTypeByOrder(order);
    const workstation = pickWorkstationByZone(zoneType);
    const pharmacist = pickPharmacistByZone(zoneType);
    return {
      id: 'pr' + (idx + 1),
      prescriptionNo: generatePrescriptionNo(),
      orderId: order.id,
      order: order,
      patientId: order.patientId,
      patient: order.patient,
      items: order.items,
      scheduleTime: now.add(idx * 30 + 30, 'minute').format('YYYY-MM-DD HH:mm:ss'),
      expectedDuration: order.items.reduce((sum) => sum + defaultSchedulingConfig.estimatedMinutesPerDrugItem, 0),
      zoneType,
      workstationId: workstation.id,
      workstationName: workstation.name,
      assignedPharmacistId: pharmacist.id,
      assignedPharmacistName: pharmacist.name,
      status: (['pending_review', 'reviewed', 'dispensing'] as any)[idx],
      statusHistory: [{ status: 'pending_review', time: order.orderTime, operator: '系统自动生成' }],
      drugConflicts: [],
      barcode: generateBarcode(),
      errorRecord: [],
    };
  });
};

export const generateMaintenanceWorkOrders = (): MaintenanceWorkOrder[] => [
  {
    id: 'wo001',
    workOrderNo: 'WB' + now.format('YYYYMMDD') + '001',
    deviceId: 'dev004',
    deviceName: '生物安全柜 B-002',
    type: 'filter_replace',
    priority: 'urgent',
    description: '高效过滤器剩余寿命不足5%，需立即更换HEPA过滤器及密封检测',
    status: 'in_progress',
    assignedTeamId: 's008',
    assignedTeamName: '周工',
    createdTime: now.subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    scheduledTime: now.format('YYYY-MM-DD HH:mm:ss'),
    startedTime: now.subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    usedParts: [{ partId: 'sp001', partName: '高效过滤器(BSC用)', quantity: 1 }],
  },
  {
    id: 'wo002',
    workOrderNo: 'WB' + now.format('YYYYMMDD') + '002',
    deviceId: 'dev006',
    deviceName: '层流洁净台 C-001',
    type: 'routine',
    priority: 'normal',
    description: '月度常规维护保养：清洁消毒、压差检测、紫外灯强度检测',
    status: 'pending',
    assignedTeamId: null,
    createdTime: now.subtract(30, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    scheduledTime: now.add(4, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    usedParts: [],
  },
  {
    id: 'wo003',
    workOrderNo: 'WB' + now.format('YYYYMMDD') + '003',
    deviceId: 'dev002',
    deviceName: '生物安全柜 A-002',
    type: 'pressure_check',
    priority: 'normal',
    description: '洁净区压差巡检校准，距下次维护周期剩余5天',
    status: 'pending',
    assignedTeamId: null,
    createdTime: now.subtract(15, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    scheduledTime: now.add(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
    usedParts: [],
  },
];
