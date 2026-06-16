import React, { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Drawer,
  Descriptions,
  message,
  Row,
  Col,
  Input,
  Select,
  Card,
  Timeline,
  Progress,
  Form,
  InputNumber,
  DatePicker,
  Tooltip,
  Badge,
  Alert,
  Divider,
} from 'antd';
import {
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SendOutlined,
  ReloadOutlined,
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  CheckSquareOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../store/useAppStore';
import { Prescription, PrescriptionStatus, Workstation, Staff } from '../types';
import dayjs from 'dayjs';

const { Search } = Input;
const { TextArea } = Input;

const PrescriptionSchedule: React.FC = () => {
  const {
    prescriptions,
    workstations,
    staff,
    reviewPrescription,
    updatePrescriptionStatus,
    requestAdjustment,
    adjustmentRequests,
    currentUserId,
    generateSchedule,
  } = useAppStore();

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [detailDrawer, setDetailDrawer] = useState(false);
  const [currentPrescription, setCurrentPrescription] = useState<Prescription | null>(null);
  const [adjustModal, setAdjustModal] = useState(false);
  const [form] = Form.useForm();

  const zoneMap: Record<string, { label: string; color: string }> = {
    antibiotic_zone: { label: '抗生素区', color: 'blue' },
    chemo_zone: { label: '化疗药区', color: 'magenta' },
    nutrition_zone: { label: '营养区', color: 'green' },
    general_zone: { label: '普通区', color: 'orange' },
  };

  const statusMap: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
    pending_review: { color: 'gold', text: '待审核', icon: <ClockCircleOutlined /> },
    reviewed: { color: 'blue', text: '已审核待调配', icon: <CheckSquareOutlined /> },
    rejected: { color: 'red', text: '已驳回', icon: <CloseCircleOutlined /> },
    dispensing: { color: 'cyan', text: '调配中', icon: <PlayCircleOutlined /> },
    checking: { color: 'purple', text: '成品核对', icon: <EyeOutlined /> },
    delivered: { color: 'green', text: '已配送', icon: <CheckCircleOutlined /> },
    adjustment_requested: { color: 'orange', text: '调整申请中', icon: <EditOutlined /> },
    adjustment_approved: { color: 'geekblue', text: '调整已批准', icon: <ThunderboltOutlined /> },
  };

  const filteredPrescriptions = prescriptions.filter((p) => {
    const matchText =
      searchText === '' ||
      p.prescriptionNo.toLowerCase().includes(searchText.toLowerCase()) ||
      p.patient.name.includes(searchText) ||
      p.patient.bedNumber.includes(searchText) ||
      (p.assignedPharmacistName && p.assignedPharmacistName.includes(searchText));
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchZone = zoneFilter === 'all' || p.zoneType === zoneFilter;
    return matchText && matchStatus && matchZone;
  });

  const isOvertime = (p: Prescription) => {
    if (p.status !== 'dispensing' || !p.actualStartTime) return false;
    const elapsed = dayjs().diff(dayjs(p.actualStartTime), 'minute');
    return elapsed > (p.expectedDuration + 30);
  };

  const columns = [
    {
      title: '处方号',
      dataIndex: 'prescriptionNo',
      key: 'prescriptionNo',
      width: 170,
      fixed: 'left' as const,
      render: (v: string, r: Prescription) => (
        <Space>
          {isOvertime(r) && <Badge status="error" />}
          <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{v}</span>
          {r.splitBatchNo && <Tag color="purple">拆分{r.splitBatchNo}</Tag>}
        </Space>
      ),
    },
    {
      title: '患者信息',
      key: 'patient',
      width: 180,
      render: (_: any, r: Prescription) => (
        <div>
          <div style={{ fontWeight: 600 }}>
            {r.patient.name}
            <span style={{ color: '#8c8c8c', fontWeight: 400, marginLeft: 4 }}>
              ({r.patient.gender === 'male' ? '男' : '女'}{r.patient.age}岁)
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            {r.patient.bedNumber}
          </div>
        </div>
      ),
    },
    {
      title: '分区/工位',
      key: 'zone',
      width: 180,
      render: (_: any, r: Prescription) => (
        <div>
          <Tag color={zoneMap[r.zoneType]?.color}>{zoneMap[r.zoneType]?.label}</Tag>
          <div style={{ fontSize: 12, color: '#595959', marginTop: 4 }}>
            📍 {r.workstationName || '未分配'}
          </div>
        </div>
      ),
    },
    {
      title: '调配药师',
      key: 'pharmacist',
      width: 100,
      render: (_: any, r: Prescription) => (
        <Tag color="blue" icon={<EditOutlined />}>
          {r.assignedPharmacistName || '待分配'}
        </Tag>
      ),
    },
    {
      title: '药物配伍',
      key: 'conflict',
      width: 120,
      render: (_: any, r: Prescription) => {
        if (r.drugConflicts.length === 0) {
          return <Tag color="success">✓ 无禁忌</Tag>;
        }
        return (
          <Tooltip title={r.drugConflicts.join('\n')}>
            <Tag color="error" icon={<WarningOutlined />}>
              {r.drugConflicts.length}项禁忌
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '预计时长',
      key: 'duration',
      width: 100,
      render: (_: any, r: Prescription) => {
        let actual = 0;
        if (r.actualStartTime && r.actualEndTime) {
          actual = dayjs(r.actualEndTime).diff(dayjs(r.actualStartTime), 'minute');
        } else if (r.actualStartTime) {
          actual = dayjs().diff(dayjs(r.actualStartTime), 'minute');
        }
        return (
          <div>
            <div>{r.expectedDuration} 分钟</div>
            {actual > 0 && (
              <Progress
                percent={Math.min(100, Math.round((actual / r.expectedDuration) * 100))}
                size="small"
                showInfo={false}
                status={actual > r.expectedDuration ? 'exception' : 'active'}
                style={{ marginTop: 4 }}
              />
            )}
          </div>
        );
      },
    },
    {
      title: '排程时间',
      dataIndex: 'scheduleTime',
      key: 'scheduleTime',
      width: 160,
    },
    {
      title: '状态',
      key: 'status',
      width: 130,
      render: (_: any, r: Prescription) => {
        const s = statusMap[r.status] || { color: 'default', text: r.status, icon: null };
        return (
          <Tag color={s.color} icon={s.icon} style={{ fontWeight: 500 }}>
            {s.text}
          </Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 260,
      fixed: 'right' as const,
      render: (_: any, r: Prescription) => (
        <Space size="small" wrap>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => { setCurrentPrescription(r); setDetailDrawer(true); }}>
            详情
          </Button>
          {r.status === 'pending_review' && (
            <>
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                style={{ color: '#52c41a' }}
                onClick={() => {
                  Modal.confirm({
                    title: '确认审核通过该处方？',
                    content: `处方号：${r.prescriptionNo}，患者：${r.patient.name}，通过后将推送至操作台。`,
                    onOk: () => reviewPrescription(r.id, true, currentUserId),
                  });
                }}
              >
                审核通过
              </Button>
              <Button
                type="link"
                size="small"
                icon={<CloseCircleOutlined />}
                style={{ color: '#ff4d4f' }}
                onClick={() => {
                  Modal.confirm({
                    title: '驳回处方',
                    content: '请输入驳回原因：',
                    okText: '确认驳回',
                    okButtonProps: { danger: true },
                    onOk: () => {
                      const note = window.prompt('请输入详细驳回原因：');
                      if (note) reviewPrescription(r.id, false, currentUserId, note);
                    },
                  });
                }}
              >
                驳回
              </Button>
            </>
          )}
          {r.status === 'reviewed' && (
            <>
              <Button
                type="link"
                size="small"
                icon={<SendOutlined />}
                style={{ color: '#1677ff' }}
                onClick={() => {
                  updatePrescriptionStatus(r.id, 'dispensing', currentUserId, '推送至操作台开始调配');
                  message.success('处方已推送至操作台');
                }}
              >
                开始调配
              </Button>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => { setCurrentPrescription(r); setAdjustModal(true); }}
              >
                申请调整
              </Button>
            </>
          )}
          {r.status === 'dispensing' && (
            <Button
              type="link"
              size="small"
              icon={<CheckSquareOutlined />}
              style={{ color: '#722ed1' }}
              onClick={() => {
                updatePrescriptionStatus(r.id, 'checking', currentUserId, '调配完成，进入成品核对');
                message.success('进入成品核对阶段');
              }}
            >
              完成调配
            </Button>
          )}
          {r.status === 'checking' && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              style={{ color: '#52c41a' }}
              onClick={() => {
                updatePrescriptionStatus(r.id, 'delivered', currentUserId, '核对完成，已安排配送');
                message.success('处方已完成并配送');
              }}
            >
              确认配送
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const handleAdjustSubmit = (values: any) => {
    if (!currentPrescription) return;
    const currentStaff = staff.find((s) => s.id === currentUserId);
    requestAdjustment(
      currentPrescription.id,
      currentUserId,
      currentStaff?.name || '未知用户',
      values.reason,
      {
        workstationId: values.workstationId,
        pharmacistId: values.pharmacistId,
        scheduleTime: values.scheduleTime ? dayjs(values.scheduleTime).format('YYYY-MM-DD HH:mm:ss') : undefined,
      }
    );
    setAdjustModal(false);
    form.resetFields();
  };

  return (
    <div>
      <div className="page-card">
        <div className="page-title">
          <Row justify="space-between" align="middle">
            <Col>
              <ReloadOutlined style={{ marginRight: 8 }} />
              智能排程管理中心
            </Col>
            <Col>
              <Space>
                <Button icon={<ReloadOutlined />} onClick={() => { generateSchedule(); message.success('已重新执行智能排程'); }}>
                  重新智能排程
                </Button>
                <Button icon={<SendOutlined />} type="primary" onClick={() => message.success('批量推送指令已发送至各操作台终端')}>
                  批量推送操作台
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            <Space size="large">
              <span>💡 调度规则：抗生素优先 → 常规用药 → 化疗药延后2小时</span>
              <span>🏥 分区隔离：化疗/营养/抗生素/普通四区独立分配</span>
              <span>⏱️ 超时预警：调配超预计+30分钟自动告警并可重调度</span>
            </Space>
          }
        />

        <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Search
              placeholder="搜索处方号/患者/药师"
              allowClear
              onSearch={setSearchText}
              onChange={(e) => !e.target.value && setSearchText('')}
            />
          </Col>
          <Col span={4}>
            <Select value={zoneFilter} onChange={setZoneFilter} style={{ width: '100%' }}>
              <Select.Option value="all">全部分区</Select.Option>
              <Select.Option value="antibiotic_zone">抗生素区</Select.Option>
              <Select.Option value="chemo_zone">化疗药区</Select.Option>
              <Select.Option value="nutrition_zone">营养区</Select.Option>
              <Select.Option value="general_zone">普通区</Select.Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select value={statusFilter} onChange={setStatusFilter} style={{ width: '100%' }}>
              <Select.Option value="all">全部状态</Select.Option>
              <Select.Option value="pending_review">待审核</Select.Option>
              <Select.Option value="reviewed">已审核待调配</Select.Option>
              <Select.Option value="dispensing">调配中</Select.Option>
              <Select.Option value="checking">核对中</Select.Option>
              <Select.Option value="delivered">已配送</Select.Option>
              <Select.Option value="adjustment_requested">调整申请中</Select.Option>
            </Select>
          </Col>
          <Col span={10}>
            <Space wrap>
              {Object.entries(statusMap).map(([key, val]) => {
                const count = prescriptions.filter((p) => p.status === key).length;
                return (
                  <Tag key={key} color={val.color} style={{ padding: '4px 10px', fontSize: 12 }}>
                    {val.text}: <strong>{count}</strong>
                  </Tag>
                );
              })}
            </Space>
          </Col>
        </Row>

        <Table
          dataSource={filteredPrescriptions}
          columns={columns}
          rowKey="id"
          scroll={{ x: 1400 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 张处方`,
            defaultPageSize: 10,
          }}
          rowClassName={(r) => (isOvertime(r) ? 'row-overtime' : '')}
          expandable={{
            expandedRowRender: (r) => (
              <Card size="small" title="用药明细" style={{ margin: '0 40px' }}>
                <Row gutter={[16, 8]}>
                  {r.items.map((item, idx) => (
                    <Col span={8} key={idx}>
                      <Tag color="geekblue" style={{ marginBottom: 4 }}>药品{idx + 1}</Tag>
                      <div style={{ padding: 8, background: '#fafafa', borderRadius: 4 }}>
                        <div style={{ fontWeight: 600 }}>{item.drugName}</div>
                        <div style={{ fontSize: 12, color: '#595959' }}>
                          {item.dosage} · {item.frequency}
                        </div>
                        {item.infusionSpeed && (
                          <div style={{ fontSize: 12, color: '#1677ff' }}>
                            滴速：{item.infusionSpeed} 滴/分
                          </div>
                        )}
                      </div>
                    </Col>
                  ))}
                </Row>
              </Card>
            ),
          }}
        />
      </div>

      <Drawer title="处方详情" width={720} open={detailDrawer} onClose={() => setDetailDrawer(false)}>
        {currentPrescription && (
          <>
            <Alert
              message={
                <Space>
                  <Tag color={statusMap[currentPrescription.status]?.color} icon={statusMap[currentPrescription.status]?.icon}>
                    {statusMap[currentPrescription.status]?.text}
                  </Tag>
                  <span>处方号：{currentPrescription.prescriptionNo}</span>
                  {isOvertime(currentPrescription) && (
                    <Tag color="red" icon={<WarningOutlined />}>调配超时！</Tag>
                  )}
                </Space>
              }
              showIcon
              type={isOvertime(currentPrescription) ? 'error' : 'info'}
              style={{ marginBottom: 16 }}
            />

            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="条形码" span={2}>
                <code style={{ fontSize: 16, letterSpacing: 2 }}>{currentPrescription.barcode}</code>
              </Descriptions.Item>
              <Descriptions.Item label="患者">{currentPrescription.patient.name}</Descriptions.Item>
              <Descriptions.Item label="床号">{currentPrescription.patient.bedNumber}</Descriptions.Item>
              <Descriptions.Item label="科室">{currentPrescription.patient.department}</Descriptions.Item>
              <Descriptions.Item label="诊断">{currentPrescription.patient.diagnosis}</Descriptions.Item>
              <Descriptions.Item label="调配分区">
                <Tag color={zoneMap[currentPrescription.zoneType]?.color}>
                  {zoneMap[currentPrescription.zoneType]?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="分配工位">{currentPrescription.workstationName || '-'}</Descriptions.Item>
              <Descriptions.Item label="调配药师">{currentPrescription.assignedPharmacistName || '-'}</Descriptions.Item>
              <Descriptions.Item label="预计时长">{currentPrescription.expectedDuration} 分钟</Descriptions.Item>
              <Descriptions.Item label="计划时间">{currentPrescription.scheduleTime}</Descriptions.Item>
              {currentPrescription.actualStartTime && (
                <Descriptions.Item label="实际开始">{currentPrescription.actualStartTime}</Descriptions.Item>
              )}
              {currentPrescription.actualEndTime && (
                <Descriptions.Item label="实际完成">{currentPrescription.actualEndTime}</Descriptions.Item>
              )}
              {currentPrescription.splitBatchNo && (
                <Descriptions.Item label="单元拆分">
                  第 {currentPrescription.splitBatchNo} 批次
                </Descriptions.Item>
              )}
            </Descriptions>

            {currentPrescription.drugConflicts.length > 0 && (
              <Alert
                type="warning"
                showIcon
                icon={<WarningOutlined />}
                message="配伍禁忌提示"
                style={{ marginBottom: 16 }}
                description={
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {currentPrescription.drugConflicts.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                }
              />
            )}

            <Divider orientation="left" style={{ margin: '16px 0' }}>状态流转时间线</Divider>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Timeline
                items={currentPrescription.statusHistory.map((h) => {
                  const s = statusMap[h.status] || { color: 'blue', text: h.status };
                  return {
                    color: s.color,
                    children: (
                      <div>
                        <div>
                          <strong style={{ color: s.color }}>{s.text}</strong>
                          <span style={{ marginLeft: 12, color: '#8c8c8c', fontSize: 12 }}>{h.time}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#595959' }}>
                          操作人：{h.operator}
                          {h.note && <div>备注：{h.note}</div>}
                        </div>
                      </div>
                    ),
                  };
                })}
              />
            </Card>
          </>
        )}
      </Drawer>

      <Modal
        title="申请处方调整"
        open={adjustModal}
        onCancel={() => setAdjustModal(false)}
        onOk={() => form.submit()}
        okText="提交申请"
        cancelText="取消"
        width={600}
      >
        <Alert
          type="warning"
          showIcon
          message="调整申请需经药学部主任审批后方可生效"
          style={{ marginBottom: 16 }}
        />
        <Form form={form} onFinish={handleAdjustSubmit} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="重新分配工位" name="workstationId">
                <Select showSearch placeholder="选择工位" optionFilterProp="label">
                  {workstations
                    .filter((w: Workstation) => w.currentStatus !== 'maintenance')
                    .map((w: Workstation) => (
                      <Select.Option key={w.id} value={w.id} label={w.name}>
                        {w.name} [{zoneMap[w.zoneType]?.label}] ({w.currentStatus === 'idle' ? '空闲' : '占用'})
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="重新分配药师" name="pharmacistId">
                <Select showSearch placeholder="选择药师" optionFilterProp="label">
                  {staff
                    .filter((s: Staff) => s.isOnDuty && (s.role === 'pharmacist_dispenser' || s.role === 'nurse'))
                    .map((s: Staff) => (
                      <Select.Option key={s.id} value={s.id} label={s.name}>
                        {s.name} ({s.role === 'pharmacist_dispenser' ? '药师' : '护士'}) 今日{s.dailyDispenseCount}张
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

      <style>{`
        .row-overtime {
          background: #fff1f0 !important;
        }
        .row-overtime:hover > td {
          background: #ffe7e6 !important;
        }
      `}</style>
    </div>
  );
};

export default PrescriptionSchedule;
