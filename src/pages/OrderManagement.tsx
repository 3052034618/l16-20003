import React, { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Drawer,
  Descriptions,
  message,
  InputNumber,
  Row,
  Col,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../store/useAppStore';
import { mockDrugs, mockPatients } from '../mock/data';
import dayjs from 'dayjs';
import { DoctorOrder, OrderType } from '../types';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

const OrderManagement: React.FC = () => {
  const { orders, reviewOrder, addOrder, generateSchedule } = useAppStore();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [detailDrawer, setDetailDrawer] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<DoctorOrder | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewType, setReviewType] = useState<'approve' | 'reject'>('approve');
  const [form] = Form.useForm();
  const [items, setItems] = useState<{ drugId: string; dosage: string; frequency: string }[]>([]);

  const filteredOrders = orders.filter((o) => {
    const matchText =
      searchText === '' ||
      o.orderNo.toLowerCase().includes(searchText.toLowerCase()) ||
      o.patient.name.includes(searchText) ||
      o.patient.bedNumber.includes(searchText) ||
      o.orderingDoctor.includes(searchText);
    const matchStatus = statusFilter === 'all' || o.reviewStatus === statusFilter;
    const matchType = typeFilter === 'all' || o.orderType === typeFilter;
    return matchText && matchStatus && matchType;
  });

  const columns = [
    {
      title: '医嘱号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 160,
      render: (v: string, r: DoctorOrder) => (
        <Space>
          {r.priority === 'emergency' && (
            <Badge status="error" text={<Tag color="red">紧急</Tag>} />
          )}
          {r.priority === 'urgent' && <Tag color="orange">急</Tag>}
          <span style={{ fontFamily: 'monospace' }}>{v}</span>
        </Space>
      ),
    },
    { title: '类型', dataIndex: 'orderType', key: 'orderType', width: 80, render: (v: OrderType) => (v === 'long_term' ? <Tag color="blue">长期</Tag> : <Tag color="green">临时</Tag>) },
    {
      title: '患者信息',
      key: 'patient',
      width: 200,
      render: (_: any, r: DoctorOrder) => (
        <div>
          <div style={{ fontWeight: 600 }}>
            {r.patient.name} <span style={{ color: '#8c8c8c', fontWeight: 400 }}>({r.patient.gender === 'male' ? '男' : '女'}，{r.patient.age}岁)</span>
          </div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            {r.patient.bedNumber} · {r.patient.department}
          </div>
        </div>
      ),
    },
    {
      title: '药物列表',
      key: 'items',
      width: 260,
      render: (_: any, r: DoctorOrder) => (
        <div>
          {r.items.map((item, idx) => (
            <div key={idx} style={{ fontSize: 12, marginBottom: 2 }}>
              <Tag color="geekblue">{item.drugName}</Tag>
              <span style={{ color: '#595959' }}>
                {item.dosage} {item.frequency}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    { title: '开嘱科室', dataIndex: 'orderingDepartment', key: 'dept', width: 110 },
    { title: '开嘱医生', dataIndex: 'orderingDoctor', key: 'doctor', width: 100 },
    { title: '开嘱时间', dataIndex: 'orderTime', key: 'orderTime', width: 160 },
    {
      title: '审核状态',
      dataIndex: 'reviewStatus',
      key: 'status',
      width: 100,
      render: (v: string) => {
        const map: Record<string, { color: string; text: string }> = {
          pending: { color: 'gold', text: '待审核' },
          approved: { color: 'green', text: '已审核' },
          rejected: { color: 'red', text: '已驳回' },
        };
        const s = map[v] || { color: 'default', text: v };
        return <Tag color={s.color} style={{ fontWeight: 500 }}>{s.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right' as const,
      render: (_: any, r: DoctorOrder) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => { setCurrentOrder(r); setDetailDrawer(true); }}>
            查看
          </Button>
          {r.reviewStatus === 'pending' && (
            <>
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                style={{ color: '#52c41a' }}
                onClick={() => {
                  setCurrentOrder(r);
                  setReviewType('approve');
                  setReviewModal(true);
                }}
              >
                通过
              </Button>
              <Button
                type="link"
                size="small"
                icon={<CloseCircleOutlined />}
                style={{ color: '#ff4d4f' }}
                onClick={() => {
                  setCurrentOrder(r);
                  setReviewType('reject');
                  setReviewModal(true);
                }}
              >
                驳回
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const handleReview = (values: any) => {
    if (!currentOrder) return;
    reviewOrder(currentOrder.id, reviewType === 'approve', useAppStore.getState().currentUserId, values.note);
    setReviewModal(false);
    form.resetFields();
  };

  const handleAddItem = () => {
    setItems([...items, { drugId: '', dosage: '', frequency: '每日一次' }]);
  };

  const handleRemoveItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (items.length === 0) {
        message.error('请至少添加一个药物条目');
        return;
      }
      const patient = mockPatients.find((p) => p.id === values.patientId) || mockPatients[0];
      const order: DoctorOrder = {
        id: 'o_' + Date.now(),
        orderNo: 'YZ' + dayjs().format('YYYYMMDDHHmmss'),
        orderType: values.orderType,
        patientId: values.patientId,
        patient,
        orderingDepartment: values.orderingDepartment,
        orderingDoctor: values.orderingDoctor,
        orderTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        expectedStartTime: values.expectedStartTime ? dayjs(values.expectedStartTime).format('YYYY-MM-DD HH:mm:ss') : dayjs().add(30, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        items: items.map((item, idx) => {
          const drug = mockDrugs.find((d) => d.id === item.drugId);
          return {
            id: 'oi_' + idx + '_' + Date.now(),
            drugId: item.drugId,
            drugName: drug?.name || '',
            dosage: item.dosage,
            frequency: item.frequency,
            administrationRoute: '静脉滴注',
          };
        }),
        priority: values.priority || 'normal',
        isValid: true,
        reviewStatus: 'pending',
      };
      addOrder(order);
      setAddModal(false);
      setItems([]);
      form.resetFields();
      message.success('医嘱录入成功');
    } catch (e: any) {
      if (e.errorFields) return;
    }
  };

  return (
    <div>
      <div className="page-card">
        <div className="page-title">
          <Row justify="space-between" align="middle">
            <Col>
              <SearchOutlined style={{ marginRight: 8 }} />
              医嘱管理中心
            </Col>
            <Col>
              <Space>
                <Button icon={<ReloadOutlined />} onClick={() => generateSchedule()}>
                  执行智能排程
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModal(true)}>
                  手工录入医嘱
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="搜索医嘱号/患者/床位/医生"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Select value={typeFilter} onChange={setTypeFilter} style={{ width: '100%' }}>
              <Select.Option value="all">全部类型</Select.Option>
              <Select.Option value="long_term">长期医嘱</Select.Option>
              <Select.Option value="temporary">临时医嘱</Select.Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select value={statusFilter} onChange={setStatusFilter} style={{ width: '100%' }}>
              <Select.Option value="all">全部状态</Select.Option>
              <Select.Option value="pending">待审核</Select.Option>
              <Select.Option value="approved">已通过</Select.Option>
              <Select.Option value="rejected">已驳回</Select.Option>
            </Select>
          </Col>
          <Col span={8}>
            <RangePicker showTime style={{ width: '100%' }} placeholder={['开始时间', '结束时间']} />
          </Col>
        </Row>

        <Table
          dataSource={filteredOrders}
          columns={columns}
          rowKey="id"
          scroll={{ x: 1300 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条医嘱`,
            defaultPageSize: 10,
          }}
        />
      </div>

      <Drawer title="医嘱详情" width={720} open={detailDrawer} onClose={() => setDetailDrawer(false)}>
        {currentOrder && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="医嘱号" span={2}>
                <Space>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{currentOrder.orderNo}</span>
                  {currentOrder.priority === 'emergency' && <Tag color="red">紧急</Tag>}
                  {currentOrder.priority === 'urgent' && <Tag color="orange">加急</Tag>}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="医嘱类型">
                {currentOrder.orderType === 'long_term' ? '长期医嘱' : '临时医嘱'}
              </Descriptions.Item>
              <Descriptions.Item label="审核状态">
                {currentOrder.reviewStatus === 'pending' && <Tag color="gold">待审核</Tag>}
                {currentOrder.reviewStatus === 'approved' && <Tag color="green">已通过</Tag>}
                {currentOrder.reviewStatus === 'rejected' && <Tag color="red">已驳回</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="患者姓名">{currentOrder.patient.name}</Descriptions.Item>
              <Descriptions.Item label="性别/年龄">
                {currentOrder.patient.gender === 'male' ? '男' : '女'} / {currentOrder.patient.age}岁
              </Descriptions.Item>
              <Descriptions.Item label="床号">{currentOrder.patient.bedNumber}</Descriptions.Item>
              <Descriptions.Item label="诊断">{currentOrder.patient.diagnosis}</Descriptions.Item>
              <Descriptions.Item label="开嘱科室">{currentOrder.orderingDepartment}</Descriptions.Item>
              <Descriptions.Item label="开嘱医生">{currentOrder.orderingDoctor}</Descriptions.Item>
              <Descriptions.Item label="开嘱时间" span={2}>
                {currentOrder.orderTime}
              </Descriptions.Item>
              <Descriptions.Item label="预计开始时间" span={2}>
                {currentOrder.expectedStartTime}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ fontWeight: 600, marginBottom: 12 }}>
              <ExclamationCircleOutlined style={{ color: '#1677ff', marginRight: 6 }} />
              用药明细（{currentOrder.items.length} 项）
            </div>
            <Table
              dataSource={currentOrder.items}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                { title: '序号', key: 'idx', width: 60, render: (_: any, __: any, i: number) => i + 1 },
                { title: '药品名称', dataIndex: 'drugName', key: 'drug' },
                { title: '剂量', dataIndex: 'dosage', key: 'dosage', width: 100 },
                { title: '频次', dataIndex: 'frequency', key: 'freq', width: 120 },
                { title: '给药途径', dataIndex: 'administrationRoute', key: 'route', width: 100 },
                { title: '滴速', dataIndex: 'infusionSpeed', key: 'speed', width: 80, render: (v) => (v ? v + ' 滴/分' : '-') },
              ]}
            />
          </>
        )}
      </Drawer>

      <Modal
        title={reviewType === 'approve' ? '审核通过医嘱' : '驳回医嘱'}
        open={reviewModal}
        onCancel={() => setReviewModal(false)}
        onOk={() => form.submit()}
        okText="确认"
        cancelText="取消"
        okButtonProps={{ danger: reviewType === 'reject' }}
      >
        <Form form={form} onFinish={handleReview} layout="vertical">
          {reviewType === 'reject' && (
            <Form.Item
              label="驳回原因"
              name="note"
              rules={[{ required: true, message: '请输入驳回原因' }]}
            >
              <TextArea rows={4} placeholder="请详细说明驳回原因..." />
            </Form.Item>
          )}
          {reviewType === 'approve' && (
            <div style={{ padding: 12, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
              <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
              确认通过该医嘱？通过后将自动进入智能排程系统。
            </div>
          )}
        </Form>
      </Modal>

      <Modal
        title="手工录入医嘱"
        open={addModal}
        onCancel={() => { setAddModal(false); setItems([]); form.resetFields(); }}
        onOk={handleSubmit}
        okText="提交"
        cancelText="取消"
        width={800}
        maskClosable={false}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="医嘱类型" name="orderType" initialValue="long_term" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="long_term">长期医嘱</Select.Option>
                  <Select.Option value="temporary">临时医嘱</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="优先级" name="priority" initialValue="normal">
                <Select>
                  <Select.Option value="normal">普通</Select.Option>
                  <Select.Option value="urgent">加急</Select.Option>
                  <Select.Option value="emergency">紧急</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="患者" name="patientId" rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="label">
                  {mockPatients.map((p) => (
                    <Select.Option key={p.id} value={p.id} label={p.name}>
                      {p.name} ({p.bedNumber} · {p.department})
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="预计开始时间" name="expectedStartTime">
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="开嘱科室" name="orderingDepartment" rules={[{ required: true }]} initialValue="呼吸内科">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="开嘱医生" name="orderingDoctor" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ border: '1px solid #f0f0f0', padding: 12, borderRadius: 6, marginBottom: 12 }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600 }}>用药明细</div>
              <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={handleAddItem}>
                添加药品
              </Button>
            </Row>
            {items.length === 0 && (
              <div style={{ textAlign: 'center', padding: 24, color: '#8c8c8c' }}>暂无药品，请点击上方"添加药品"</div>
            )}
            {items.map((item, idx) => (
              <Row gutter={8} key={idx} style={{ marginBottom: 8 }} align="middle">
                <Col flex="2">
                  <Select
                    value={item.drugId}
                    onChange={(v) => {
                      const newItems = [...items];
                      newItems[idx].drugId = v;
                      setItems(newItems);
                    }}
                    showSearch
                    placeholder="选择药品"
                    optionFilterProp="label"
                    style={{ width: '100%' }}
                  >
                    {mockDrugs.map((d) => (
                      <Select.Option key={d.id} value={d.id} label={d.name}>
                        {d.name} ({d.specification})
                      </Select.Option>
                    ))}
                  </Select>
                </Col>
                <Col flex="1">
                  <Input
                    placeholder="剂量"
                    value={item.dosage}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[idx].dosage = e.target.value;
                      setItems(newItems);
                    }}
                  />
                </Col>
                <Col flex="1">
                  <Select
                    value={item.frequency}
                    onChange={(v) => {
                      const newItems = [...items];
                      newItems[idx].frequency = v;
                      setItems(newItems);
                    }}
                    style={{ width: '100%' }}
                  >
                    <Select.Option value="每日一次">每日一次</Select.Option>
                    <Select.Option value="每日二次">每日二次</Select.Option>
                    <Select.Option value="每日三次">每日三次</Select.Option>
                    <Select.Option value="q8h">q8h</Select.Option>
                    <Select.Option value="立即执行">立即执行</Select.Option>
                  </Select>
                </Col>
                <Col span={2}>
                  <Button type="text" danger size="small" onClick={() => handleRemoveItem(idx)}>
                    删除
                  </Button>
                </Col>
              </Row>
            ))}
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default OrderManagement;
