import React, { useState, useMemo } from 'react';
import {
  Card,
  Tag,
  Button,
  Space,
  Row,
  Col,
  Descriptions,
  Badge,
  Timeline,
  Avatar,
  Modal,
  Form,
  Select,
  Input,
  DatePicker,
  message,
  Divider,
  Empty,
  Tooltip,
  Alert,
  Tabs,
} from 'antd';
import {
  PlayCircleOutlined,
  CheckCircleOutlined,
  EditOutlined,
  ClockCircleOutlined,
  UserOutlined,
  MedicineBoxOutlined,
  SafetyOutlined,
  TeamOutlined,
  ReloadOutlined,
  WarningOutlined,
  SendOutlined,
  SwapRightOutlined,
  EyeOutlined,
  AuditOutlined,
  UserAddOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../store/useAppStore';
import { Prescription, Workstation, Staff, ZoneType } from '../types';
import dayjs from 'dayjs';

const { TextArea } = Input;

type ViewMode = 'reviewer' | 'dispenser' | 'director';

const zoneMap: Record<string, { label: string; color: string; bg: string }> = {
  antibiotic_zone: { label: '抗生素区', color: '#1677ff', bg: '#e6f4ff' },
  chemo_zone: { label: '化疗药区', color: '#eb2f96', bg: '#fff0f6' },
  nutrition_zone: { label: '营养区', color: '#52c41a', bg: '#f6ffed' },
  general_zone: { label: '普通区', color: '#8c8c8c', bg: '#fafafa' },
};

const statusMap: Record<string, { label: string; color: string; icon: any }> = {
  pending_review: { label: '待审核', color: 'gold', icon: <ClockCircleOutlined /> },
  reviewed: { label: '待调配', color: 'blue', icon: <SafetyOutlined /> },
  dispensing: { label: '调配中', color: 'processing', icon: <PlayCircleOutlined /> },
  checking: { label: '核对中', color: 'purple', icon: <MedicineBoxOutlined /> },
  delivered: { label: '已配送', color: 'green', icon: <CheckCircleOutlined /> },
  adjustment_requested: { label: '调整审批中', color: 'orange', icon: <EditOutlined /> },
  adjustment_approved: { label: '已调整', color: 'cyan', icon: <SwapRightOutlined /> },
  rejected: { label: '已驳回', color: 'red', icon: <WarningOutlined /> },
};

const roleLabel: Record<string, string> = {
  pharmacist_reviewer: '审方药师',
  pharmacist_dispenser: '调配药师',
  nurse: '护士',
  director: '药学部主任',
  maintenance: '设备工程师',
};

const WorkstationTerminal: React.FC = () => {
  const {
    prescriptions,
    workstations,
    staff,
    currentUserId,
    adjustmentRequests,
    updatePrescriptionStatus,
    requestAdjustment,
    reviewPrescription,
    setCurrentUserId,
    claimTask,
  } = useAppStore();

  const currentUser = staff.find((s) => s.id === currentUserId) || staff[0];

  const defaultView: ViewMode =
    currentUser?.role === 'pharmacist_reviewer'
      ? 'reviewer'
      : currentUser?.role === 'director'
      ? 'director'
      : 'dispenser';

  const [viewMode, setViewMode] = useState<ViewMode>(defaultView);
  const [selectedWorkstationId, setSelectedWorkstationId] = useState<string>(
    workstations.find((w) => (currentUser?.skills || []).includes(w.zoneType))?.id || workstations[0]?.id || ''
  );
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [adjustModal, setAdjustModal] = useState(false);
  const [form] = Form.useForm();
  const [approvalModal, setApprovalModal] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<Prescription | null>(null);

  const selectedWsId = Form.useWatch('workstationId', form);
  const selectedPhId = Form.useWatch('pharmacistId', form);

  const accessibleZones = useMemo(() => {
    if (viewMode === 'director') return ['antibiotic_zone', 'chemo_zone', 'nutrition_zone', 'general_zone'] as ZoneType[];
    return (currentUser?.skills as ZoneType[]) || ['general_zone'];
  }, [viewMode, currentUser]);

  const accessibleWorkstations = useMemo(
    () => workstations.filter((w) => accessibleZones.includes(w.zoneType)),
    [workstations, accessibleZones]
  );

  const queuePrescriptions = useMemo(() => {
    let list = prescriptions.filter((p) => p.status !== 'delivered' && p.status !== 'rejected');

    if (viewMode === 'reviewer') {
      list = list.filter((p) => p.status === 'pending_review');
    } else if (viewMode === 'dispenser') {
      list = list.filter((p) =>
        ['reviewed', 'dispensing', 'checking', 'adjustment_approved'].includes(p.status)
      );
      list = list.filter((p) => p.workstationId === selectedWorkstationId);
      list = list.filter((p) => {
        if (p.status === 'reviewed') {
          return !p.claimedBy || p.claimedBy === currentUserId;
        }
        if (p.status === 'dispensing') {
          return p.claimedBy === currentUserId || p.assignedPharmacistId === currentUserId;
        }
        return true;
      });
    } else {
      list = list.filter((p) => accessibleZones.includes(p.zoneType));
    }

    return list.sort((a, b) => dayjs(a.scheduleTime).valueOf() - dayjs(b.scheduleTime).valueOf());
  }, [prescriptions, viewMode, selectedWorkstationId, currentUserId, accessibleZones]);

  const selectedWorkstation = workstations.find((w) => w.id === selectedWorkstationId);

  const handleClaim = (p: Prescription) => {
    claimTask(p.id, currentUserId);
    message.success(`已领取处方 ${p.prescriptionNo}，请到您的队列中查看`);
  };

  const handleStart = (p: Prescription) => {
    if (!p.claimedBy) {
      claimTask(p.id, currentUserId);
    }
    updatePrescriptionStatus(p.id, 'dispensing', currentUser?.name || '', '药师开始调配');
    message.success(`开始调配处方 ${p.prescriptionNo}`);
  };

  const handleFinish = (p: Prescription) => {
    updatePrescriptionStatus(p.id, 'checking', currentUser?.name || '', '调配完成，自动转入成品核对');
    message.success(`处方 ${p.prescriptionNo} 调配完成，已推送至成品核对工位`);
  };

  const handleReviewOk = (p: Prescription) => {
    reviewPrescription(p.id, true, currentUserId, '操作台终端审方通过');
    message.success('处方已审核通过，进入待调配队列');
  };

  const handleAdjustSubmit = (values: any) => {
    if (!selectedPrescription) return;
    requestAdjustment(
      selectedPrescription.id,
      currentUserId,
      currentUser?.name || '',
      values.reason,
      {
        workstationId: values.workstationId,
        pharmacistId: values.pharmacistId,
        scheduleTime: values.scheduleTime ? dayjs(values.scheduleTime).format('YYYY-MM-DD HH:mm:ss') : undefined,
      }
    );
    setAdjustModal(false);
    form.resetFields();
    setSelectedPrescription(null);
    message.success('调整申请已提交，等待药学部主任审批');
  };

  const checkPharmacistMatch = (p: Prescription) => {
    const req = adjustmentRequests.find((r) => r.prescriptionId === p.id && r.status === 'pending');
    if (!req) return { ok: true, suggestions: [] as Staff[] };

    const targetWsId = req.proposedChanges.workstationId || p.workstationId;
    const targetPhId = req.proposedChanges.pharmacistId || p.assignedPharmacistId;

    if (!targetWsId || !targetPhId) return { ok: true, suggestions: [] as Staff[] };

    const targetWs = workstations.find((w) => w.id === targetWsId);
    const targetPh = staff.find((s) => s.id === targetPhId);

    if (!targetWs || !targetPh) return { ok: true, suggestions: [] as Staff[] };

    const hasSkill = (targetPh.skills as ZoneType[]).includes(targetWs.zoneType);

    if (hasSkill) return { ok: true, suggestions: [] as Staff[] };

    const suitablePharmacists = staff.filter(
      (s) =>
        s.isOnDuty &&
        s.id !== targetPhId &&
        (s.role === 'pharmacist_dispenser' || s.role === 'nurse') &&
        (s.skills as ZoneType[]).includes(targetWs.zoneType)
    );

    return { ok: false, suggestions: suitablePharmacists };
  };

  const handleApproveAdjust = (p: Prescription, approved: boolean) => {
    const { reviewAdjustment, adjustmentRequests } = useAppStore.getState();
    const req = adjustmentRequests.find((r) => r.prescriptionId === p.id && r.status === 'pending');
    if (!req) {
      message.warning('未找到待审批的调整申请');
      return;
    }
    reviewAdjustment(req.id, approved, currentUserId, approved ? '主任审批通过' : '主任驳回');
    setApprovalModal(false);
    setPendingApproval(null);
    message.success(approved ? '调整已批准，工位队列已自动迁移' : '调整申请已驳回');
  };

  const handleUserChange = (id: string) => {
    setCurrentUserId(id);
    const u = staff.find((s) => s.id === id);
    if (u?.role === 'pharmacist_reviewer') setViewMode('reviewer');
    else if (u?.role === 'director') setViewMode('director');
    else setViewMode('dispenser');
    const firstWs = workstations.find((w) => (u?.skills || []).includes(w.zoneType));
    if (firstWs) setSelectedWorkstationId(firstWs.id);
    message.success(`已切换至 ${u?.name || id}（${roleLabel[u?.role || ''] || ''}）`);
  };

  const renderDiffTag = (label: string, before?: string, after?: string) => {
    if (!before || !after || before === after) return null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Tag color="default" style={{ margin: 0 }}>{label}</Tag>
        <span style={{ color: '#ff4d4f', textDecoration: 'line-through', fontSize: 12 }}>{before}</span>
        <SwapRightOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />
        <span style={{ color: '#52c41a', fontWeight: 600, fontSize: 12 }}>{after}</span>
      </div>
    );
  };

  const renderTaskCard = (p: Prescription, idx: number) => {
    const status = statusMap[p.status] || statusMap.pending_review;
    const zone = zoneMap[p.zoneType] || zoneMap.general_zone;
    const isActive = selectedPrescription?.id === p.id;
    return (
      <Card
        key={p.id}
        size="small"
        hoverable
        onClick={() => setSelectedPrescription(p)}
        style={{
          marginBottom: 12,
          borderLeft: `4px solid ${zone.color}`,
          background: isActive ? zone.bg : '#fff',
          boxShadow: isActive ? '0 4px 12px rgba(22,119,255,0.2)' : '0 1px 3px rgba(0,0,0,0.06)',
        }}
        title={
          <Space>
            <Tag color={zone.color} style={{ margin: 0 }}>
              {zone.label}
            </Tag>
            <code style={{ fontSize: 12 }}>{p.prescriptionNo}</code>
            {idx === 0 && p.status === 'reviewed' && viewMode === 'dispenser' && (
              <Tag color="red" icon={<PlayCircleOutlined />}>
                下一张
              </Tag>
            )}
            {p.status === 'reviewed' && p.claimedBy && p.claimedBy === currentUserId && (
              <Tag color="blue" icon={<UserSwitchOutlined />}>
                已领取
              </Tag>
            )}
            {p.status === 'reviewed' && p.claimedBy && p.claimedBy !== currentUserId && (
              <Tag color="default" icon={<UserOutlined />}>
                {p.claimedByName} 领取中
              </Tag>
            )}
            {p.lastAdjustment && (
              <Tag color="cyan" icon={<SwapRightOutlined />}>
                已调整
              </Tag>
            )}
          </Space>
        }
        extra={<Badge status={status.color as any} text={status.label} />}
      >
        {p.lastAdjustment && (
          <Alert
            type="info"
            showIcon
            icon={<SwapRightOutlined />}
            style={{ marginBottom: 8, padding: '4px 8px' }}
            message={
              <div style={{ fontSize: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  最近调整 · {p.lastAdjustment.approvedBy} 审批 · {p.lastAdjustment.approvedAt}
                </div>
                {renderDiffTag('工位', p.lastAdjustment.previousWorkstationName, p.workstationName)}
                {renderDiffTag('药师', p.lastAdjustment.previousPharmacistName, p.assignedPharmacistName)}
                {renderDiffTag('时间', p.lastAdjustment.previousScheduleTime, p.scheduleTime)}
                {p.lastAdjustment.reason && (
                  <div style={{ color: '#595959' }}>原因：{p.lastAdjustment.reason}</div>
                )}
              </div>
            }
          />
        )}
        <Descriptions column={2} size="small" bordered={false}>
          <Descriptions.Item label="患者">
            <Space>
              <Avatar size={22} style={{ background: zone.color, fontSize: 12 }}>
                {p.patient?.name?.charAt(0)}
              </Avatar>
              <strong>{p.patient?.name}</strong>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="床号">{p.patient?.bedNumber}</Descriptions.Item>
          <Descriptions.Item label="计划时间" span={2}>
            <ClockCircleOutlined style={{ color: '#8c8c8c' }} /> {p.scheduleTime}
          </Descriptions.Item>
          {viewMode === 'director' && (
            <>
              <Descriptions.Item label="工位">{p.workstationName || '-'}</Descriptions.Item>
              <Descriptions.Item label="药师">{p.assignedPharmacistName || '-'}</Descriptions.Item>
            </>
          )}
        </Descriptions>
        <Divider style={{ margin: '8px 0' }} />
        <div style={{ marginBottom: 8 }}>
          {p.items.slice(0, 3).map((it, i) => (
            <Tag key={i} color="geekblue" style={{ marginBottom: 4 }}>
              {it.drugName} {it.dosage}
            </Tag>
          ))}
          {p.items.length > 3 && <Tag>更多 +{p.items.length - 3}</Tag>}
        </div>
        {p.drugConflicts?.length > 0 && (
          <Alert type="warning" showIcon icon={<WarningOutlined />} message={`${p.drugConflicts.length}项配伍禁忌`} style={{ marginBottom: 8, padding: '4px 8px' }} />
        )}
        <Space size="small" wrap>
          {viewMode === 'reviewer' && p.status === 'pending_review' && (
            <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={(e) => { e.stopPropagation(); handleReviewOk(p); }}>
              审方通过
            </Button>
          )}
          {viewMode === 'dispenser' && p.status === 'reviewed' && !p.claimedBy && (
            <Button type="primary" size="small" icon={<UserAddOutlined />} onClick={(e) => { e.stopPropagation(); handleClaim(p); }}>
              领取任务
            </Button>
          )}
          {viewMode === 'dispenser' && p.status === 'reviewed' && p.claimedBy === currentUserId && (
            <Button type="primary" size="small" icon={<PlayCircleOutlined />} onClick={(e) => { e.stopPropagation(); handleStart(p); }}>
              开始调配
            </Button>
          )}
          {viewMode === 'dispenser' && p.status === 'dispensing' && (p.claimedBy === currentUserId || p.assignedPharmacistId === currentUserId) && (
            <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={(e) => { e.stopPropagation(); handleFinish(p); }}>
              完成调配
            </Button>
          )}
          {viewMode === 'director' && p.status === 'adjustment_requested' && (
            <Button type="primary" size="small" icon={<AuditOutlined />} onClick={(e) => { e.stopPropagation(); setPendingApproval(p); setApprovalModal(true); }}>
              审批调整
            </Button>
          )}
          {viewMode === 'director' && (
            <Button size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); setSelectedPrescription(p); }}>
              查看
            </Button>
          )}
          {viewMode !== 'reviewer' && p.status !== 'adjustment_requested' && (
            <Button size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); setSelectedPrescription(p); setAdjustModal(true); }}>
              申请调整
            </Button>
          )}
        </Space>
      </Card>
    );
  };

  const viewTitle: Record<ViewMode, string> = {
    reviewer: '审方工作台',
    dispenser: '调配工作台',
    director: '主任监控台',
  };

  return (
    <div style={{ padding: 16, minHeight: '100vh', background: '#f0f2f5' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <Card style={{ marginBottom: 16, borderRadius: 12 }}>
          <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
            <Col>
              <Space size="large">
                <Avatar size={48} style={{ background: zoneMap[accessibleZones[0]]?.color || '#1677ff', fontSize: 18 }}>
                  {currentUser?.name?.charAt(0)}
                </Avatar>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>
                    <TeamOutlined style={{ marginRight: 8 }} />
                    PIVAS 洁净区操作台
                    <Tag color={accessibleZones.length > 1 ? 'purple' : zoneMap[accessibleZones[0]]?.color} style={{ marginLeft: 12 }}>
                      {accessibleZones.map((z) => zoneMap[z]?.label).join(' / ')}
                    </Tag>
                  </div>
                  <div style={{ color: '#595959', fontSize: 13 }}>
                    当前登录：<strong>{currentUser?.name}</strong>（{roleLabel[currentUser?.role || ''] || ''}）
                    {' | '}
                    {dayjs().format('YYYY年MM月DD日 dddd HH:mm')}
                  </div>
                </div>
              </Space>
            </Col>
            <Col>
              <Space>
                <span style={{ color: '#8c8c8c', fontSize: 12 }}>切换身份：</span>
                <Select
                  value={currentUserId}
                  onChange={handleUserChange}
                  style={{ width: 200 }}
                  optionFilterProp="label"
                >
                  {staff
                    .filter((s) => ['pharmacist_reviewer', 'pharmacist_dispenser', 'nurse', 'director'].includes(s.role))
                    .map((s) => (
                      <Select.Option key={s.id} value={s.id} label={s.name}>
                        <Space>
                          <Avatar size={20} style={{ fontSize: 12 }}>{s.name.charAt(0)}</Avatar>
                          <span>{s.name}</span>
                          <Tag color="blue" style={{ margin: 0 }}>{roleLabel[s.role]}</Tag>
                          {s.isOnDuty ? <Tag color="green">在岗</Tag> : <Tag color="default">离岗</Tag>}
                        </Space>
                      </Select.Option>
                    ))}
                </Select>
                <Button icon={<ReloadOutlined />} onClick={() => message.success('已刷新队列')}>
                  刷新
                </Button>
              </Space>
            </Col>
          </Row>

          <Tabs
            activeKey={viewMode}
            onChange={(k) => setViewMode(k as ViewMode)}
            items={[
              {
                key: 'reviewer',
                label: (
                  <span>
                    <SafetyOutlined /> 审方屏
                    <Badge
                      count={prescriptions.filter((p) => p.status === 'pending_review').length}
                      style={{ marginLeft: 6, backgroundColor: '#faad14' }}
                    />
                  </span>
                ),
              },
              {
                key: 'dispenser',
                label: (
                  <span>
                    <MedicineBoxOutlined /> 调配屏
                    <Badge
                      count={queuePrescriptions.filter((p) => ['reviewed', 'dispensing'].includes(p.status)).length}
                      style={{ marginLeft: 6 }}
                    />
                  </span>
                ),
              },
              {
                key: 'director',
                label: (
                  <span>
                    <AuditOutlined /> 主任屏
                    <Badge
                      count={prescriptions.filter((p) => p.status === 'adjustment_requested').length}
                      style={{ marginLeft: 6, backgroundColor: '#eb2f96' }}
                    />
                  </span>
                ),
              },
            ]}
          />
        </Card>

        <Row gutter={16}>
          <Col span={15}>
            <Card
              title={
                <Space>
                  {viewMode === 'dispenser' ? (
                    <>
                      <MedicineBoxOutlined style={{ color: zoneMap[accessibleZones[0]]?.color }} />
                      {selectedWorkstation?.name || '工作台'} - 待调配队列
                      <Badge count={queuePrescriptions.length} style={{ backgroundColor: '#52c41a' }} />
                    </>
                  ) : viewMode === 'reviewer' ? (
                    <>
                      <SafetyOutlined style={{ color: '#faad14' }} />
                      待审核处方
                      <Badge count={queuePrescriptions.length} style={{ backgroundColor: '#faad14' }} />
                    </>
                  ) : (
                    <>
                      <AuditOutlined style={{ color: '#eb2f96' }} />
                      全工位任务总览
                      <Badge count={queuePrescriptions.length} />
                    </>
                  )}
                </Space>
              }
              bodyStyle={{ padding: 12, background: viewMode === 'dispenser' ? zoneMap[accessibleZones[0]]?.bg : '#fafafa', borderRadius: 8 }}
              extra={
                viewMode === 'dispenser' ? (
                  <Space>
                    <Select
                      value={selectedWorkstationId}
                      onChange={setSelectedWorkstationId}
                      style={{ width: 220 }}
                      optionFilterProp="label"
                    >
                      {accessibleWorkstations.map((w: Workstation) => (
                        <Select.Option key={w.id} value={w.id} label={w.name}>
                          <Space>
                            <Tag color={zoneMap[w.zoneType]?.color}>{zoneMap[w.zoneType]?.label}</Tag>
                            <span>{w.name}</span>
                            <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                              {w.currentStatus === 'idle' ? '空闲' : w.currentStatus === 'occupied' ? '调配中' : w.currentStatus}
                            </span>
                          </Space>
                        </Select.Option>
                      ))}
                    </Select>
                    <Tooltip title="批量推送操作台">
                      <Button size="small" icon={<SendOutlined />}>
                        推送至工位屏
                      </Button>
                    </Tooltip>
                  </Space>
                ) : null
              }
            >
              {queuePrescriptions.length === 0 ? (
                <Empty description={viewMode === 'reviewer' ? '当前没有待审核处方' : viewMode === 'dispenser' ? '当前工位暂无待调配任务' : '暂无任务'} />
              ) : (
                queuePrescriptions.map(renderTaskCard)
              )}
            </Card>
          </Col>

          <Col span={9}>
            <Card title={<Space><SafetyOutlined style={{ color: '#1677ff' }} />处方详情</Space>}>
              {!selectedPrescription ? (
                <Empty description="点击左侧任务卡片查看处方详情" style={{ padding: '40px 0' }} />
              ) : (
                <>
                  <Alert
                    showIcon
                    icon={statusMap[selectedPrescription.status]?.icon}
                    type={selectedPrescription.status === 'dispensing' ? 'info' : selectedPrescription.status === 'delivered' ? 'success' : selectedPrescription.status === 'adjustment_requested' ? 'warning' : 'info'}
                    message={
                      <Space>
                        <Tag color={statusMap[selectedPrescription.status]?.color}>
                          {statusMap[selectedPrescription.status]?.label}
                        </Tag>
                        <code>{selectedPrescription.prescriptionNo}</code>
                      </Space>
                    }
                    style={{ marginBottom: 12 }}
                  />

                  {selectedPrescription.lastAdjustment && (
                    <Alert
                      type="info"
                      showIcon
                      icon={<SwapRightOutlined />}
                      style={{ marginBottom: 12 }}
                      message={
                        <div>
                          <div style={{ fontWeight: 600, marginBottom: 6 }}>
                            调整记录 · {selectedPrescription.lastAdjustment.approvedBy} 审批 · {selectedPrescription.lastAdjustment.approvedAt}
                          </div>
                          {renderDiffTag('工位', selectedPrescription.lastAdjustment.previousWorkstationName, selectedPrescription.workstationName)}
                          {renderDiffTag('调配药师', selectedPrescription.lastAdjustment.previousPharmacistName, selectedPrescription.assignedPharmacistName)}
                          {renderDiffTag('排程时间', selectedPrescription.lastAdjustment.previousScheduleTime, selectedPrescription.scheduleTime)}
                          <div style={{ color: '#595959', fontSize: 12, marginTop: 4 }}>调整原因：{selectedPrescription.lastAdjustment.reason}</div>
                        </div>
                      }
                    />
                  )}

                  <Descriptions bordered size="small" column={1} style={{ marginBottom: 12 }}>
                    <Descriptions.Item label="患者">
                      <Space>
                        <Avatar size={26}>{selectedPrescription.patient?.name?.charAt(0)}</Avatar>
                        <strong>{selectedPrescription.patient?.name}</strong>
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="床号 / 科室">
                      {selectedPrescription.patient?.bedNumber} / {selectedPrescription.patient?.department}
                    </Descriptions.Item>
                    <Descriptions.Item label="诊断">{selectedPrescription.patient?.diagnosis}</Descriptions.Item>
                    <Descriptions.Item label="分配工位">{selectedPrescription.workstationName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="调配药师">{selectedPrescription.assignedPharmacistName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="计划时间">
                      <ClockCircleOutlined /> {selectedPrescription.scheduleTime}
                    </Descriptions.Item>
                    <Descriptions.Item label="预计时长">{selectedPrescription.expectedDuration} 分钟</Descriptions.Item>
                    {selectedPrescription.splitBatchNo && (
                      <Descriptions.Item label="单元拆分">第 {selectedPrescription.splitBatchNo} 批次</Descriptions.Item>
                    )}
                  </Descriptions>

                  <Divider orientation="left" style={{ fontSize: 12 }}>💊 用药明细</Divider>
                  {selectedPrescription.items.map((it, i) => (
                    <Card key={i} size="small" style={{ marginBottom: 8 }}>
                      <Row>
                        <Col span={16}>
                          <div style={{ fontWeight: 600 }}>{it.drugName}</div>
                          <div style={{ color: '#595959', fontSize: 12 }}>{it.dosage} · {it.frequency} · {it.administrationRoute}</div>
                          {it.infusionSpeed && (
                            <div style={{ color: '#1677ff', fontSize: 12 }}>💧 滴速 {it.infusionSpeed} 滴/分</div>
                          )}
                        </Col>
                      </Row>
                    </Card>
                  ))}

                  {selectedPrescription.drugConflicts?.length > 0 && (
                    <>
                      <Divider orientation="left" style={{ fontSize: 12 }}>⚠️ 配伍禁忌提示</Divider>
                      <Alert type="warning" showIcon icon={<WarningOutlined />} message="以下药品存在配伍风险"
                        description={
                          <ul style={{ margin: 0, paddingLeft: 20 }}>
                            {selectedPrescription.drugConflicts.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        }
                      />
                    </>
                  )}

                  <Divider orientation="left" style={{ fontSize: 12 }}>📝 状态流转</Divider>
                  <Timeline
                    items={selectedPrescription.statusHistory.map((h) => {
                      const s = statusMap[h.status] || statusMap.pending_review;
                      return {
                        color: s.color as any,
                        dot: s.icon,
                        children: (
                          <div>
                            <div>
                              <strong style={{ color: s.color }}>{s.label}</strong>
                              <span style={{ marginLeft: 12, color: '#8c8c8c', fontSize: 12 }}>{h.time}</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#595959' }}>操作人：{h.operator}</div>
                            {h.note && <div style={{ fontSize: 12, color: '#8c8c8c' }}>备注：{h.note}</div>}
                          </div>
                        ),
                      };
                    })}
                  />
                </>
              )}
            </Card>
          </Col>
        </Row>
      </div>

      <Modal
        title="申请处方调整"
        open={adjustModal}
        onCancel={() => setAdjustModal(false)}
        onOk={() => form.submit()}
        okText="提交申请"
        cancelText="取消"
        width={600}
      >
        <Alert type="warning" showIcon message="调整申请需药学部主任审批后方可生效" style={{ marginBottom: 16 }} />
        <Form form={form} onFinish={handleAdjustSubmit} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="重新分配工位" name="workstationId">
                <Select
                  showSearch
                  placeholder="选择工位"
                  optionFilterProp="label"
                  onChange={(val) => {
                    const selectedWs = workstations.find((w) => w.id === val);
                    const currentPh = form.getFieldValue('pharmacistId');
                    if (selectedWs && currentPh) {
                      const ph = staff.find((s) => s.id === currentPh);
                      if (ph && !(ph.skills as ZoneType[]).includes(selectedWs.zoneType)) {
                        form.setFieldsValue({ pharmacistId: undefined });
                        message.warning(`所选药师不具备${zoneMap[selectedWs.zoneType]?.label}操作资质，已自动清空`);
                      }
                    }
                  }}
                >
                  {workstations
                    .filter((w) => w.currentStatus !== 'maintenance')
                    .filter((w) => {
                      if (!selectedPhId) return true;
                      const ph = staff.find((s) => s.id === selectedPhId);
                      return ph ? (ph.skills as ZoneType[]).includes(w.zoneType) : true;
                    })
                    .map((w) => (
                      <Select.Option key={w.id} value={w.id} label={w.name}>
                        {w.name} [{zoneMap[w.zoneType]?.label}]
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="重新分配药师" name="pharmacistId">
                <Select
                  showSearch
                  placeholder="选择药师"
                  optionFilterProp="label"
                  onChange={(val) => {
                    const selectedPh = staff.find((s) => s.id === val);
                    const currentWs = form.getFieldValue('workstationId');
                    if (selectedPh && currentWs) {
                      const ws = workstations.find((w) => w.id === currentWs);
                      if (ws && !(selectedPh.skills as ZoneType[]).includes(ws.zoneType)) {
                        form.setFieldsValue({ workstationId: undefined });
                        message.warning(`所选工位${zoneMap[ws.zoneType]?.label}不在该药师资质范围内，已自动清空`);
                      }
                    }
                  }}
                >
                  {staff
                    .filter((s) => s.isOnDuty && (s.role === 'pharmacist_dispenser' || s.role === 'nurse'))
                    .filter((s) => {
                      if (!selectedWsId) return true;
                      const ws = workstations.find((w) => w.id === selectedWsId);
                      return ws ? (s.skills as ZoneType[]).includes(ws.zoneType) : true;
                    })
                    .map((s) => (
                      <Select.Option key={s.id} value={s.id} label={s.name}>
                        <Space>
                          <span>{s.name}</span>
                          <span style={{ color: '#8c8c8c', fontSize: 11 }}>
                            ({s.skills.map((sk) => zoneMap[sk]?.label).join('、')})
                          </span>
                        </Space>
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="调整排程时间" name="scheduleTime">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="调整原因" name="reason" rules={[{ required: true, message: '请说明调整原因' }]}>
            <TextArea rows={4} placeholder="请详细说明需要调整的原因..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="审批调整申请 · 主任指挥台"
        open={approvalModal}
        onCancel={() => { setApprovalModal(false); setPendingApproval(null); }}
        footer={[
          <Button key="reject" danger onClick={() => pendingApproval && handleApproveAdjust(pendingApproval, false)}>
            驳回申请
          </Button>,
          <Button
            key="approve"
            type="primary"
            disabled={pendingApproval ? !checkPharmacistMatch(pendingApproval).ok : false}
            onClick={() => pendingApproval && handleApproveAdjust(pendingApproval, true)}
          >
            批准调整
          </Button>,
        ]}
        width={700}
      >
        {pendingApproval && (
          <>
            <Alert type="warning" showIcon message={`处方 ${pendingApproval.prescriptionNo}（${pendingApproval.patient?.name}）的调整申请等待审批`} style={{ marginBottom: 16 }} />

            <Card size="small" title={<Space><SwapRightOutlined style={{ color: '#1677ff' }} />调整前后对比</Space>} style={{ marginBottom: 16 }}>
              {(() => {
                const req = adjustmentRequests.find((r) => r.prescriptionId === pendingApproval.id && r.status === 'pending');
                const newWs = req?.proposedChanges.workstationId
                  ? workstations.find((w) => w.id === req.proposedChanges.workstationId)
                  : null;
                const newPh = req?.proposedChanges.pharmacistId
                  ? staff.find((s) => s.id === req.proposedChanges.pharmacistId)
                  : null;
                const match = checkPharmacistMatch(pendingApproval);

                return (
                  <>
                    <div style={{ marginBottom: 8, fontSize: 13, color: '#8c8c8c' }}>
                      📝 调整原因：{req?.reason || '-'}
                    </div>
                    {renderDiffTag('分配工位', pendingApproval.workstationName || '未分配', newWs?.name)}
                    {renderDiffTag('调配药师', pendingApproval.assignedPharmacistName || '未分配', newPh?.name)}
                    {req?.proposedChanges.scheduleTime && renderDiffTag('排程时间', pendingApproval.scheduleTime, req.proposedChanges.scheduleTime)}

                    {newWs && newPh && (
                      <div style={{ marginTop: 12, padding: '8px 12px', background: match.ok ? '#f6ffed' : '#fff1f0', borderRadius: 6 }}>
                        <Space size="middle">
                          <span style={{ fontWeight: 600, color: match.ok ? '#52c41a' : '#ff4d4f' }}>
                            {match.ok ? '✅ 人员-分区匹配' : '⚠️ 人员-分区不匹配'}
                          </span>
                          <span style={{ fontSize: 12, color: '#595959' }}>
                            {newWs.name} 属于 <Tag color={zoneMap[newWs.zoneType]?.color}>{zoneMap[newWs.zoneType]?.label}</Tag>
                            {newPh.name} 技能：{newPh.skills.map((s) => zoneMap[s]?.label).join('、') || '无'}
                          </span>
                        </Space>
                      </div>
                    )}

                    {!match.ok && match.suggestions.length > 0 && (
                      <Alert
                        type="error"
                        showIcon
                        style={{ marginTop: 12 }}
                        message={
                          <div>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>建议更换以下药师：</div>
                            <Space wrap>
                              {match.suggestions.map((s) => (
                                <Tag key={s.id} color="blue">
                                  {s.name}（{s.skills.map((sk) => zoneMap[sk]?.label).join('、')}）
                                </Tag>
                              ))}
                            </Space>
                          </div>
                        }
                      />
                    )}
                  </>
                );
              })()}
            </Card>

            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="申请人">
                {adjustmentRequests.find((r) => r.prescriptionId === pendingApproval.id && r.status === 'pending')?.requesterName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="申请时间">
                {adjustmentRequests.find((r) => r.prescriptionId === pendingApproval.id && r.status === 'pending')?.requestedTime || '-'}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </div>
  );
};

export default WorkstationTerminal;
