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
} from '@ant-design/icons';
import { useAppStore } from '../store/useAppStore';
import { Prescription, Workstation, Staff, ZoneType } from '../types';
import dayjs from 'dayjs';

const { TextArea } = Input;

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
  rejected: { label: '已驳回', color: 'red', icon: <WarningOutlined /> },
};

const WorkstationTerminal: React.FC = () => {
  const {
    prescriptions,
    workstations,
    staff,
    currentUserId,
    updatePrescriptionStatus,
    requestAdjustment,
    reviewPrescription,
  } = useAppStore();

  const currentUser = staff.find((s) => s.id === currentUserId) || staff[0];
  const accessibleZone = (currentUser?.skills?.[0] as ZoneType) || 'general_zone';

  const [selectedWorkstationId, setSelectedWorkstationId] = useState<string>(
    workstations.find((w) => w.zoneType === accessibleZone)?.id || workstations[0]?.id || ''
  );
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [adjustModal, setAdjustModal] = useState(false);
  const [form] = Form.useForm();

  const accessibleWorkstations = useMemo(
    () => workstations.filter((w) => w.zoneType === accessibleZone || currentUser?.role === 'director'),
    [workstations, accessibleZone, currentUser]
  );

  const queuePrescriptions = useMemo(() => {
    return prescriptions
      .filter((p) => p.workstationId === selectedWorkstationId && p.status !== 'delivered' && p.status !== 'rejected')
      .sort((a, b) => dayjs(a.scheduleTime).valueOf() - dayjs(b.scheduleTime).valueOf());
  }, [prescriptions, selectedWorkstationId]);

  const selectedWorkstation = workstations.find((w) => w.id === selectedWorkstationId);

  const handleStart = (p: Prescription) => {
    updatePrescriptionStatus(p.id, 'dispensing', currentUser?.name || '', '药师开始调配');
    message.success(`开始调配处方 ${p.prescriptionNo}`);
  };

  const handleFinish = (p: Prescription) => {
    updatePrescriptionStatus(p.id, 'checking', currentUser?.name || '', '调配完成，转入成品核对');
    message.success(`处方 ${p.prescriptionNo} 调配完成，已推送至核对工位`);
  };

  const handleReviewOk = (p: Prescription) => {
    reviewPrescription(p.id, true, currentUserId, '操作台终端审方通过');
    message.success('处方已审核通过');
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
            {idx === 0 && p.status === 'reviewed' && (
              <Tag color="red" icon={<PlayCircleOutlined />}>
                下一张
              </Tag>
            )}
          </Space>
        }
        extra={<Badge status={status.color as any} text={status.label} />}
      >
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
          {p.status === 'pending_review' && currentUser?.role === 'pharmacist_reviewer' && (
            <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={(e) => { e.stopPropagation(); handleReviewOk(p); }}>
              审方通过
            </Button>
          )}
          {p.status === 'reviewed' && (
            <Button type="primary" size="small" icon={<PlayCircleOutlined />} onClick={(e) => { e.stopPropagation(); handleStart(p); }}>
              开始调配
            </Button>
          )}
          {p.status === 'dispensing' && p.assignedPharmacistId === currentUserId && (
            <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={(e) => { e.stopPropagation(); handleFinish(p); }}>
              完成调配
            </Button>
          )}
          <Button size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); setSelectedPrescription(p); setAdjustModal(true); }}>
            申请调整
          </Button>
        </Space>
      </Card>
    );
  };

  return (
    <div style={{ padding: 16, minHeight: '100vh', background: '#f0f2f5' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <Card style={{ marginBottom: 16, borderRadius: 12 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Space size="large">
                <Avatar size={48} style={{ background: zoneMap[accessibleZone]?.color || '#1677ff', fontSize: 18 }}>
                  {currentUser?.name?.charAt(0)}
                </Avatar>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>
                    <TeamOutlined style={{ marginRight: 8 }} />
                    洁净区操作台终端
                    <Tag color={zoneMap[accessibleZone]?.color} style={{ marginLeft: 12 }}>
                      {zoneMap[accessibleZone]?.label}
                    </Tag>
                  </div>
                  <div style={{ color: '#595959', fontSize: 13 }}>
                    当前登录：<strong>{currentUser?.name}</strong>（
                    {currentUser?.role === 'pharmacist_dispenser'
                      ? '调配药师'
                      : currentUser?.role === 'pharmacist_reviewer'
                      ? '审方药师'
                      : currentUser?.role === 'director'
                      ? '药学部主任'
                      : '护士'}
                    ） | {dayjs().format('YYYY年MM月DD日 dddd HH:mm')}
                  </div>
                </div>
              </Space>
            </Col>
            <Col>
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
                <Button icon={<ReloadOutlined />} onClick={() => message.success('已刷新队列')}>
                  刷新
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        <Row gutter={16}>
          <Col span={15}>
            <Card
              title={
                <Space>
                  <MedicineBoxOutlined style={{ color: zoneMap[accessibleZone]?.color }} />
                  {selectedWorkstation?.name || '工作台'} - 待调配队列
                  <Badge count={queuePrescriptions.length} style={{ backgroundColor: '#52c41a' }} />
                </Space>
              }
              bodyStyle={{ padding: 12, background: zoneMap[accessibleZone]?.bg, borderRadius: 8 }}
              extra={
                <Tooltip title="批量推送操作台">
                  <Button size="small" icon={<SendOutlined />}>
                    推送至工位屏
                  </Button>
                </Tooltip>
              }
            >
              {queuePrescriptions.length === 0 ? (
                <Empty description="当前工位暂无待调配任务" />
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
                <Select showSearch placeholder="选择工位" optionFilterProp="label">
                  {workstations
                    .filter((w) => w.currentStatus !== 'maintenance')
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
                <Select showSearch placeholder="选择药师" optionFilterProp="label">
                  {staff
                    .filter((s) => s.isOnDuty && (s.role === 'pharmacist_dispenser' || s.role === 'nurse'))
                    .map((s) => (
                      <Select.Option key={s.id} value={s.id} label={s.name}>
                        {s.name} ({s.role === 'pharmacist_dispenser' ? '药师' : '护士'})
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
    </div>
  );
};

export default WorkstationTerminal;
