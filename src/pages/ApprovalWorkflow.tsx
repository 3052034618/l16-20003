import React, { useState } from 'react';
import {
  Tabs,
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
  Card,
  Form,
  Input,
  Timeline,
  Avatar,
  Empty,
  Divider,
  Tooltip,
  Alert,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  UserOutlined,
  EditOutlined,
  AuditOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../store/useAppStore';
import { AdjustmentRequest, Prescription, OrderType } from '../types';
import dayjs from 'dayjs';

const { TextArea } = Input;

const ApprovalWorkflow: React.FC = () => {
  const {
    orders,
    prescriptions,
    adjustmentRequests,
    reviewOrder,
    reviewPrescription,
    reviewAdjustment,
    staff,
    currentUserId,
    incompatibilityRules,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState('orders');
  const [detailDrawer, setDetailDrawer] = useState(false);
  const [detailType, setDetailType] = useState<'order' | 'prescription' | 'adjustment'>('order');
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewTargetType, setReviewTargetType] = useState<'order' | 'prescription' | 'adjustment'>('order');
  const [reviewDecision, setReviewDecision] = useState<'approve' | 'reject'>('approve');
  const [form] = Form.useForm();

  const pendingOrders = orders.filter((o) => o.reviewStatus === 'pending');
  const approvedOrders = orders.filter((o) => o.reviewStatus !== 'pending');

  const pendingPrescriptions = prescriptions.filter(
    (p) => p.status === 'pending_review' || p.status === 'adjustment_approved'
  );
  const processedPrescriptions = prescriptions.filter(
    (p) => ['reviewed', 'rejected', 'dispensing', 'checking', 'delivered', 'adjustment_requested'].includes(p.status)
  );

  const pendingAdjustments = adjustmentRequests.filter((a) => a.status === 'pending');
  const processedAdjustments = adjustmentRequests.filter((a) => a.status !== 'pending');

  const openDetail = (type: 'order' | 'prescription' | 'adjustment', record: any) => {
    setDetailType(type);
    setCurrentRecord(record);
    setDetailDrawer(true);
  };

  const openReview = (type: 'order' | 'prescription' | 'adjustment', record: any, decision: 'approve' | 'reject') => {
    setReviewTargetType(type);
    setCurrentRecord(record);
    setReviewDecision(decision);
    setReviewModal(true);
  };

  const handleReviewSubmit = (values: any) => {
    const reviewer = staff.find((s) => s.id === currentUserId);
    switch (reviewTargetType) {
      case 'order':
        reviewOrder(currentRecord.id, reviewDecision === 'approve', currentUserId, values.note);
        break;
      case 'prescription':
        reviewPrescription(currentRecord.id, reviewDecision === 'approve', currentUserId, values.note);
        break;
      case 'adjustment':
        reviewAdjustment(currentRecord.id, reviewDecision === 'approve', currentUserId, values.note);
        break;
    }
    setReviewModal(false);
    form.resetFields();
    message.success(
      `${reviewTargetType === 'order' ? '医嘱' : reviewTargetType === 'prescription' ? '处方' : '调整申请'}${
        reviewDecision === 'approve' ? '审核通过' : '已驳回'
      }`
    );
  };

  const orderColumns = [
    { title: '医嘱号', dataIndex: 'orderNo', width: 160, render: (v: string) => <span style={{ fontFamily: 'monospace' }}>{v}</span> },
    { title: '类型', dataIndex: 'orderType', width: 80, render: (v: OrderType) => (v === 'long_term' ? <Tag color="blue">长期</Tag> : <Tag color="green">临时</Tag>) },
    {
      title: '患者',
      key: 'patient',
      width: 160,
      render: (_: any, r: any) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.patient.name}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>{r.patient.bedNumber}</div>
        </div>
      ),
    },
    {
      title: '用药项',
      key: 'items',
      width: 240,
      render: (_: any, r: any) => (
        <Space wrap size={[4, 4]}>
          {r.items.slice(0, 3).map((it: any, idx: number) => (
            <Tag key={idx} color="geekblue" style={{ margin: 2 }}>
              {it.drugName}
            </Tag>
          ))}
          {r.items.length > 3 && <Tag color="default">+{r.items.length - 3}</Tag>}
        </Space>
      ),
    },
    { title: '开嘱医生', dataIndex: 'orderingDoctor', width: 100 },
    { title: '时间', dataIndex: 'orderTime', width: 160 },
    {
      title: '优先级',
      dataIndex: 'priority',
      width: 80,
      render: (v: string) => {
        const map: Record<string, { color: string; text: string }> = {
          normal: { color: 'default', text: '普通' },
          urgent: { color: 'orange', text: '加急' },
          emergency: { color: 'red', text: '紧急' },
        };
        return <Tag color={map[v]?.color}>{map[v]?.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 220,
      render: (_: any, r: any) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail('order', r)}>
            查看
          </Button>
          {r.reviewStatus === 'pending' && (
            <>
              <Button type="link" size="small" icon={<CheckCircleOutlined />} style={{ color: '#52c41a' }} onClick={() => openReview('order', r, 'approve')}>
                通过
              </Button>
              <Button type="link" size="small" icon={<CloseCircleOutlined />} style={{ color: '#ff4d4f' }} onClick={() => openReview('order', r, 'reject')}>
                驳回
              </Button>
            </>
          )}
          {r.reviewStatus !== 'pending' && (
            <Tag color={r.reviewStatus === 'approved' ? 'green' : 'red'}>
              {r.reviewStatus === 'approved' ? '已通过' : '已驳回'}
            </Tag>
          )}
        </Space>
      ),
    },
  ];

  const prescriptionColumns = [
    { title: '处方号', dataIndex: 'prescriptionNo', width: 170, render: (v: string) => <span style={{ fontFamily: 'monospace' }}>{v}</span> },
    {
      title: '患者',
      key: 'patient',
      width: 150,
      render: (_: any, r: Prescription) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.patient.name}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>{r.patient.bedNumber}</div>
        </div>
      ),
    },
    {
      title: '配伍检查',
      key: 'conflict',
      width: 120,
      render: (_: any, r: Prescription) =>
        r.drugConflicts.length === 0 ? (
          <Tag color="success" icon={<SafetyCertificateOutlined />}>通过</Tag>
        ) : (
          <Tooltip title={r.drugConflicts.join('\n')}>
            <Tag color="error" icon={<CloseCircleOutlined />}>
              {r.drugConflicts.length}项禁忌
            </Tag>
          </Tooltip>
        ),
    },
    { title: '工位', dataIndex: 'workstationName', width: 140 },
    { title: '药师', dataIndex: 'assignedPharmacistName', width: 90 },
    { title: '排程时间', dataIndex: 'scheduleTime', width: 160 },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 220,
      render: (_: any, r: Prescription) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail('prescription', r)}>
            详情
          </Button>
          {r.status === 'pending_review' && (
            <>
              <Button type="link" size="small" icon={<CheckCircleOutlined />} style={{ color: '#52c41a' }} onClick={() => openReview('prescription', r, 'approve')}>
                批准
              </Button>
              <Button type="link" size="small" icon={<CloseCircleOutlined />} style={{ color: '#ff4d4f' }} onClick={() => openReview('prescription', r, 'reject')}>
                驳回
              </Button>
            </>
          )}
          {r.status !== 'pending_review' && (
            <Tag color="blue">已处理</Tag>
          )}
        </Space>
      ),
    },
  ];

  const adjustmentColumns = [
    { title: '申请单号', dataIndex: 'requestNo', width: 170, render: (v: string) => <span style={{ fontFamily: 'monospace' }}>{v}</span> },
    { title: '处方号', dataIndex: 'prescriptionNo', width: 170 },
    { title: '申请人', dataIndex: 'requesterName', width: 90 },
    {
      title: '申请内容',
      key: 'content',
      render: (_: any, r: AdjustmentRequest) => (
        <Space direction="vertical" size={2}>
          {r.proposedChanges.workstationId && <Tag color="blue">工位变更</Tag>}
          {r.proposedChanges.pharmacistId && <Tag color="purple">药师变更</Tag>}
          {r.proposedChanges.scheduleTime && <Tag color="cyan">时间变更</Tag>}
          <div style={{ fontSize: 12, color: '#595959' }}>{r.reason}</div>
        </Space>
      ),
    },
    { title: '申请时间', dataIndex: 'requestedTime', width: 160 },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 220,
      render: (_: any, r: AdjustmentRequest) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail('adjustment', r)}>
            详情
          </Button>
          {r.status === 'pending' && (
            <>
              <Button type="link" size="small" icon={<CheckCircleOutlined />} style={{ color: '#52c41a' }} onClick={() => openReview('adjustment', r, 'approve')}>
                批准
              </Button>
              <Button type="link" size="small" icon={<CloseCircleOutlined />} style={{ color: '#ff4d4f' }} onClick={() => openReview('adjustment', r, 'reject')}>
                驳回
              </Button>
            </>
          )}
          {r.status !== 'pending' && (
            <Tag color={r.status === 'approved' ? 'green' : 'red'}>
              {r.status === 'approved' ? '已批准' : '已驳回'}
            </Tag>
          )}
        </Space>
      ),
    },
  ];

  const renderApprovalPanel = (title: string, pendingData: any[], processedData: any[], columns: any[], tabKey: string) => (
    <Tabs
      items={[
        {
          key: 'pending',
          label: (
            <Space>
              <ClockCircleOutlined />
              待审核
              {pendingData.length > 0 && <Tag color="red">{pendingData.length}</Tag>}
            </Space>
          ),
          children:
            pendingData.length === 0 ? (
              <Empty description="暂无待审核数据" style={{ padding: 48 }} />
            ) : (
              <Table
                dataSource={pendingData}
                columns={columns}
                rowKey="id"
                scroll={{ x: 1100 }}
                pagination={{ showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
              />
            ),
        },
        {
          key: 'processed',
          label: (
            <Space>
              <AuditOutlined />
              已处理
            </Space>
          ),
          children:
            processedData.length === 0 ? (
              <Empty description="暂无已处理数据" style={{ padding: 48 }} />
            ) : (
              <Table
                dataSource={processedData}
                columns={columns}
                rowKey="id"
                scroll={{ x: 1100 }}
                pagination={{ showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
              />
            ),
        },
      ]}
    />
  );

  const getCurrentUserRole = () => {
    const u = staff.find((s) => s.id === currentUserId);
    if (u?.role === 'director') return '药学部主任';
    if (u?.role === 'pharmacist_reviewer') return '审核药师';
    return '系统管理员';
  };

  return (
    <div>
      <div className="page-card">
        <div className="page-title">
          <Row justify="space-between" align="middle">
            <Col>
              <AuditOutlined style={{ marginRight: 8 }} />
              审批流程管理中心
            </Col>
            <Col>
              <Space>
                <Tag color="blue" icon={<UserOutlined />}>
                  当前用户：{staff.find((s) => s.id === currentUserId)?.name}（{getCurrentUserRole()}）
                </Tag>
              </Space>
            </Col>
          </Row>
        </div>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small" style={{ background: 'linear-gradient(135deg, #fff7e6 0%, #ffd591 100%)' }}>
              <Row align="middle" gutter={12}>
                <Col>
                  <Avatar style={{ background: '#d46b08' }} icon={<FileTextOutlined />} size={44} />
                </Col>
                <Col flex="auto">
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{pendingOrders.length}</div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>医嘱待审核</div>
                </Col>
              </Row>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ background: 'linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%)' }}>
              <Row align="middle" gutter={12}>
                <Col>
                  <Avatar style={{ background: '#0958d9' }} icon={<EditOutlined />} size={44} />
                </Col>
                <Col flex="auto">
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{pendingPrescriptions.length}</div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>处方待审核</div>
                </Col>
              </Row>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ background: 'linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%)' }}>
              <Row align="middle" gutter={12}>
                <Col>
                  <Avatar style={{ background: '#cf1322' }} icon={<SafetyCertificateOutlined />} size={44} />
                </Col>
                <Col flex="auto">
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{pendingAdjustments.length}</div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>主任审批（调整）</div>
                </Col>
              </Row>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)' }}>
              <Row align="middle" gutter={12}>
                <Col>
                  <Avatar style={{ background: '#389e0d' }} icon={<CheckCircleOutlined />} size={44} />
                </Col>
                <Col flex="auto">
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{incompatibilityRules.length}</div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>配伍禁忌规则库</div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="审批流程说明"
          description={
            <ol style={{ margin: '4px 0 0 16px' }}>
              <li><strong>审核药师</strong>：负责医嘱初审、处方审核（含配伍禁忌检查、分区分配合理性）</li>
              <li><strong>操作台终端</strong>：可对已审核处方发起调整申请（工位/药师/时间）</li>
              <li><strong>药学部主任</strong>：负责处方调整申请的最终审批</li>
            </ol>
          }
        />

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'orders',
              label: (
                <Space>
                  <FileTextOutlined />
                  医嘱审批
                  {pendingOrders.length > 0 && <Badge count={pendingOrders.length} />}
                </Space>
              ),
              children: renderApprovalPanel('医嘱', pendingOrders, approvedOrders, orderColumns, 'orders'),
            },
            {
              key: 'prescriptions',
              label: (
                <Space>
                  <EditOutlined />
                  处方审批
                  {pendingPrescriptions.length > 0 && <Badge count={pendingPrescriptions.length} />}
                </Space>
              ),
              children: renderApprovalPanel('处方', pendingPrescriptions, processedPrescriptions, prescriptionColumns, 'prescriptions'),
            },
            {
              key: 'adjustments',
              label: (
                <Space>
                  <SafetyCertificateOutlined />
                  调整申请审批（主任）
                  {pendingAdjustments.length > 0 && <Badge count={pendingAdjustments.length} />}
                </Space>
              ),
              children: renderApprovalPanel('调整申请', pendingAdjustments, processedAdjustments, adjustmentColumns, 'adjustments'),
            },
          ]}
        />
      </div>

      <Drawer
        title={
          detailType === 'order'
            ? '医嘱详情'
            : detailType === 'prescription'
            ? '处方详情'
            : '调整申请详情'
        }
        width={720}
        open={detailDrawer}
        onClose={() => setDetailDrawer(false)}
      >
        {currentRecord && detailType === 'order' && (
          <div>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="医嘱号" span={2}>
                <code>{currentRecord.orderNo}</code>
              </Descriptions.Item>
              <Descriptions.Item label="患者">{currentRecord.patient.name}</Descriptions.Item>
              <Descriptions.Item label="床号">{currentRecord.patient.bedNumber}</Descriptions.Item>
              <Descriptions.Item label="科室">{currentRecord.orderingDepartment}</Descriptions.Item>
              <Descriptions.Item label="医生">{currentRecord.orderingDoctor}</Descriptions.Item>
              <Descriptions.Item label="时间" span={2}>
                {currentRecord.orderTime}
              </Descriptions.Item>
            </Descriptions>
            <Divider />
            <div style={{ fontWeight: 600, marginBottom: 8 }}>用药明细</div>
            <Table
              dataSource={currentRecord.items}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                { title: '药品', dataIndex: 'drugName' },
                { title: '剂量', dataIndex: 'dosage', width: 100 },
                { title: '频次', dataIndex: 'frequency', width: 120 },
              ]}
            />
          </div>
        )}

        {currentRecord && detailType === 'prescription' && (
          <div>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="处方号" span={2}>
                <code>{currentRecord.prescriptionNo}</code>
              </Descriptions.Item>
              <Descriptions.Item label="患者">{currentRecord.patient.name}</Descriptions.Item>
              <Descriptions.Item label="床号">{currentRecord.patient.bedNumber}</Descriptions.Item>
              <Descriptions.Item label="工位">{currentRecord.workstationName}</Descriptions.Item>
              <Descriptions.Item label="药师">{currentRecord.assignedPharmacistName}</Descriptions.Item>
              <Descriptions.Item label="排程时间" span={2}>
                {currentRecord.scheduleTime}
              </Descriptions.Item>
            </Descriptions>
            {currentRecord.drugConflicts.length > 0 && (
              <Alert
                type="warning"
                showIcon
                message="配伍禁忌警告"
                style={{ margin: '12px 0' }}
                description={
                  <ul>
                    {currentRecord.drugConflicts.map((c: string, i: number) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                }
              />
            )}
            <Divider />
            <div style={{ fontWeight: 600, marginBottom: 8 }}>状态流转</div>
            <Timeline
              items={currentRecord.statusHistory.map((h: any) => ({
                children: (
                  <div>
                    <strong>{h.status}</strong>
                    <span style={{ marginLeft: 8, color: '#8c8c8c', fontSize: 12 }}>{h.time}</span>
                    <div style={{ fontSize: 12 }}>
                      操作人：{h.operator}
                      {h.note && <div>备注：{h.note}</div>}
                    </div>
                  </div>
                ),
              }))}
            />
          </div>
        )}

        {currentRecord && detailType === 'adjustment' && (
          <div>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="申请单号" span={2}>
                <code>{currentRecord.requestNo}</code>
              </Descriptions.Item>
              <Descriptions.Item label="关联处方">{currentRecord.prescriptionNo}</Descriptions.Item>
              <Descriptions.Item label="申请人">{currentRecord.requesterName}</Descriptions.Item>
              <Descriptions.Item label="申请时间" span={2}>
                {currentRecord.requestedTime}
              </Descriptions.Item>
              <Descriptions.Item label="申请原因" span={2}>
                {currentRecord.reason}
              </Descriptions.Item>
            </Descriptions>
            <Divider />
            <div style={{ fontWeight: 600, marginBottom: 8 }}>申请变更内容</div>
            <Card size="small" type="inner">
              {currentRecord.proposedChanges.workstationId && (
                <div>📍 工位 → {staff.find((s) => s.id === currentRecord.proposedChanges.workstationId)?.name || '待定'}</div>
              )}
              {currentRecord.proposedChanges.pharmacistId && (
                <div style={{ marginTop: 4 }}>
                  👤 药师 → {staff.find((s) => s.id === currentRecord.proposedChanges.pharmacistId)?.name || '待定'}
                </div>
              )}
              {currentRecord.proposedChanges.scheduleTime && (
                <div style={{ marginTop: 4 }}>⏰ 时间 → {currentRecord.proposedChanges.scheduleTime}</div>
              )}
            </Card>
            {currentRecord.reviewedBy && (
              <>
                <Divider />
                <Descriptions bordered size="small" column={2}>
                  <Descriptions.Item label="审批人">
                    {staff.find((s) => s.id === currentRecord.reviewedBy)?.name}
                  </Descriptions.Item>
                  <Descriptions.Item label="审批时间">{currentRecord.reviewedAt}</Descriptions.Item>
                  <Descriptions.Item label="审批结果">
                    <Tag color={currentRecord.status === 'approved' ? 'green' : 'red'}>
                      {currentRecord.status === 'approved' ? '已批准' : '已驳回'}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="审批备注">{currentRecord.reviewNote || '-'}</Descriptions.Item>
                </Descriptions>
              </>
            )}
          </div>
        )}
      </Drawer>

      <Modal
        title={
          <Space>
            {reviewDecision === 'approve' ? (
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
            ) : (
              <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
            )}
            {reviewDecision === 'approve' ? '审核通过' : '审核驳回'}
            {reviewTargetType === 'order' ? '医嘱' : reviewTargetType === 'prescription' ? '处方' : '调整申请'}
          </Space>
        }
        open={reviewModal}
        onCancel={() => setReviewModal(false)}
        onOk={() => form.submit()}
        okText="确认"
        cancelText="取消"
        okButtonProps={{ danger: reviewDecision === 'reject' }}
      >
        <Form form={form} onFinish={handleReviewSubmit} layout="vertical">
          <Alert
            type={reviewDecision === 'approve' ? 'success' : 'error'}
            showIcon
            style={{ marginBottom: 16 }}
            message={
              reviewDecision === 'approve'
                ? reviewTargetType === 'adjustment'
                  ? '批准后处方将按申请内容调整，并重新推送至操作台'
                  : reviewTargetType === 'order'
                  ? '通过后医嘱将进入智能排程队列'
                  : '通过后处方将推送至分配的操作台终端'
                : '请在下方填写驳回原因'
            }
          />
          {(reviewDecision === 'reject' || reviewTargetType === 'adjustment') && (
            <Form.Item
              label={reviewDecision === 'reject' ? '驳回原因' : '审批备注（可选）'}
              name="note"
              rules={reviewDecision === 'reject' ? [{ required: true, message: '请填写原因' }] : []}
            >
              <TextArea rows={4} placeholder="请输入审批意见..." />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <style>{`.ant-badge-count { margin-left: 4px; }`}</style>
    </div>
  );
};

const Badge = (props: { count: number; children: React.ReactNode }) => (
  <Space>
    {props.children}
    <Tag color="red" style={{ margin: 0, padding: '0 6px' }}>
      {props.count}
    </Tag>
  </Space>
);

export default ApprovalWorkflow;
