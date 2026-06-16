import React, { useState, useEffect } from 'react';
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
  Select,
  InputNumber,
  DatePicker,
  Progress,
  Timeline,
  Alert,
  Divider,
  Statistic,
  Avatar,
  Tooltip,
  Badge,
  Empty,
  List,
} from 'antd';
import {
  ToolOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileProtectOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  PlusOutlined,
  EyeOutlined,
  UserOutlined,
  SafetyOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../store/useAppStore';
import { Device, MaintenanceWorkOrder, SparePart } from '../types';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';

const { TextArea } = Input;

const DeviceMaintenance: React.FC = () => {
  const {
    devices,
    workstations,
    spareParts,
    maintenanceWorkOrders,
    staff,
    currentUserId,
    createMaintenanceWorkOrder,
    assignMaintenanceTeam,
    completeMaintenanceWorkOrder,
    checkAndGenerateMaintenanceOrders,
    consumeSpareParts,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState('workorders');
  const [detailDrawer, setDetailDrawer] = useState(false);
  const [detailType, setDetailType] = useState<'device' | 'workorder' | 'part'>('device');
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [createOrderModal, setCreateOrderModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [completeModal, setCompleteModal] = useState(false);
  const [usedParts, setUsedParts] = useState<{ partId: string; partName: string; quantity: number }[]>([]);
  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();

  useEffect(() => {
    checkAndGenerateMaintenanceOrders();
  }, []);

  const pendingOrders = maintenanceWorkOrders.filter((w) => w.status === 'pending' || w.status === 'in_progress');
  const completedOrders = maintenanceWorkOrders.filter((w) => w.status === 'completed' || w.status === 'cancelled');
  const lowStockParts = spareParts.filter((sp) => sp.quantity < sp.safetyStock);
  const needFilterDevices = devices.filter((d) => d.hepaFilterRemainingHours < d.hepaFilterLifecycleHours * 0.2);

  const deviceColumns = [
    {
      title: '设备编号',
      dataIndex: 'deviceNo',
      width: 130,
      render: (v: string) => <span style={{ fontFamily: 'monospace' }}>{v}</span>,
    },
    { title: '设备名称', dataIndex: 'name', width: 160 },
    {
      title: '类型',
      key: 'type',
      width: 110,
      render: (_: any, r: Device) => {
        const map: Record<string, { color: string; text: string }> = {
          biosafety_cabinet: { color: 'blue', text: '生物安全柜' },
          laminar_flow_bench: { color: 'green', text: '层流台' },
          pass_through: { color: 'purple', text: '传递窗' },
          clean_suit: { color: 'orange', text: '洁净服系统' },
        };
        const t = map[r.type] || { color: 'default', text: r.type };
        return <Tag color={t.color}>{t.text}</Tag>;
      },
    },
    { title: '型号', dataIndex: 'model', width: 140 },
    {
      title: '运行状态',
      key: 'status',
      width: 90,
      render: (_: any, r: Device) => {
        const map: Record<string, { color: string; text: string }> = {
          running: { color: 'green', text: '运行中' },
          idle: { color: 'default', text: '空闲' },
          maintenance: { color: 'orange', text: '维护中' },
          fault: { color: 'red', text: '故障' },
        };
        const s = map[r.status];
        return <Tag color={s?.color}>{s?.text}</Tag>;
      },
    },
    {
      title: '累计运行',
      key: 'runtime',
      width: 110,
      render: (_: any, r: Device) => `${r.accumulatedRuntimeHours}h`,
    },
    {
      title: 'HEPA过滤器剩余',
      key: 'filter',
      width: 180,
      render: (_: any, r: Device) => {
        const percent = Math.round((r.hepaFilterRemainingHours / r.hepaFilterLifecycleHours) * 100);
        const status = percent > 30 ? 'normal' : percent > 10 ? 'exception' : 'exception';
        return (
          <Tooltip title={`剩余 ${r.hepaFilterRemainingHours}h / 寿命 ${r.hepaFilterLifecycleHours}h`}>
            <Progress
              percent={percent}
              size="small"
              status={percent > 30 ? undefined : 'exception'}
              strokeColor={percent > 50 ? '#52c41a' : percent > 20 ? '#faad14' : '#ff4d4f'}
            />
          </Tooltip>
        );
      },
    },
    { title: '下次维护', dataIndex: 'nextMaintenanceDate', width: 110 },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 180,
      render: (_: any, r: Device) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => { setDetailType('device'); setCurrentRecord(r); setDetailDrawer(true); }}>
            详情
          </Button>
          <Button type="link" size="small" icon={<ToolOutlined />} onClick={() => { setCurrentRecord(r); setCreateOrderModal(true); }}>
            创建工单
          </Button>
        </Space>
      ),
    },
  ];

  const workOrderColumns = [
    {
      title: '工单号',
      dataIndex: 'workOrderNo',
      width: 160,
      render: (v: string) => <span style={{ fontFamily: 'monospace' }}>{v}</span>,
    },
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
        return <Tag color={map[v]?.color} icon={v !== 'normal' ? <ThunderboltOutlined /> : undefined}>{map[v]?.text}</Tag>;
      },
    },
    { title: '设备', dataIndex: 'deviceName', width: 160 },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      render: (v: string) => {
        const map: Record<string, { color: string; text: string }> = {
          routine: { color: 'blue', text: '常规保养' },
          repair: { color: 'red', text: '故障维修' },
          filter_replace: { color: 'purple', text: '滤网更换' },
          pressure_check: { color: 'cyan', text: '压差校准' },
        };
        return <Tag color={map[v]?.color}>{map[v]?.text}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: string) => {
        const map: Record<string, { color: string; text: string }> = {
          pending: { color: 'gold', text: '待分配' },
          in_progress: { color: 'blue', text: '进行中' },
          completed: { color: 'green', text: '已完成' },
          cancelled: { color: 'default', text: '已取消' },
        };
        return <Tag color={map[v]?.color}>{map[v]?.text}</Tag>;
      },
    },
    { title: '处理人/班组', dataIndex: 'assignedTeamName', width: 100, render: (v: string | undefined) => v || <Tag color="default">待分配</Tag> },
    { title: '预计时间', dataIndex: 'scheduledTime', width: 160 },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 260,
      render: (_: any, r: MaintenanceWorkOrder) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => { setDetailType('workorder'); setCurrentRecord(r); setDetailDrawer(true); }}>
            详情
          </Button>
          {r.status === 'pending' && (
            <Button
              type="link"
              size="small"
              icon={<UserOutlined />}
              style={{ color: '#1677ff' }}
              onClick={() => { setCurrentRecord(r); setAssignModal(true); }}
            >
              分配
            </Button>
          )}
          {r.status === 'in_progress' && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              style={{ color: '#52c41a' }}
              onClick={() => { setCurrentRecord(r); setUsedParts([]); setCompleteModal(true); }}
            >
              完成
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const partColumns = [
    { title: '备件名称', dataIndex: 'name', width: 180 },
    { title: '备件编号', dataIndex: 'partNo', width: 150, render: (v: string) => <span style={{ fontFamily: 'monospace' }}>{v}</span> },
    { title: '规格型号', dataIndex: 'specification', width: 180 },
    { title: '单位', dataIndex: 'unit', width: 60 },
    {
      title: '库存',
      key: 'stock',
      width: 200,
      render: (_: any, r: SparePart) => {
        const isLow = r.quantity < r.safetyStock;
        return (
          <Tooltip title={`安全库存: ${r.safetyStock} ${r.unit}`}>
            <Space>
              <Progress
                percent={Math.min(100, Math.round((r.quantity / (r.safetyStock * 2)) * 100))}
                size="small"
                showInfo={false}
                status={isLow ? 'exception' : 'normal'}
                strokeColor={isLow ? '#ff4d4f' : '#52c41a'}
                style={{ width: 80 }}
              />
              <Tag color={isLow ? 'red' : 'green'}>
                {r.quantity} / {r.safetyStock}
              </Tag>
            </Space>
          </Tooltip>
        );
      },
    },
    { title: '上次补货', dataIndex: 'lastRestockDate', width: 110 },
    {
      title: '状态',
      key: 'status',
      width: 80,
      render: (_: any, r: SparePart) => (r.quantity < r.safetyStock ? <Tag color="red" icon={<AlertOutlined />}>低库存</Tag> : <Tag color="green">正常</Tag>),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 100,
      render: (_: any, r: SparePart) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => { setDetailType('part'); setCurrentRecord(r); setDetailDrawer(true); }}>
          详情
        </Button>
      ),
    },
  ];

  const handleCreateOrder = (values: any) => {
    createMaintenanceWorkOrder(currentRecord.id, values.type, values.priority, values.description);
    setCreateOrderModal(false);
    form.resetFields();
  };

  const handleAssign = (values: any) => {
    const person = staff.find((s) => s.id === values.teamId);
    assignMaintenanceTeam(currentRecord.id, values.teamId, person?.name || '');
    setAssignModal(false);
    assignForm.resetFields();
    message.success('维保人员已分配');
  };

  const handleAddPart = (partId: string) => {
    const part = spareParts.find((sp) => sp.id === partId);
    if (part && !usedParts.find((p) => p.partId === partId)) {
      setUsedParts([...usedParts, { partId, partName: part.name, quantity: 1 }]);
    }
  };

  const handlePartQtyChange = (partId: string, qty: number) => {
    setUsedParts(usedParts.map((p) => (p.partId === partId ? { ...p, quantity: qty } : p)));
  };

  const handleRemovePart = (partId: string) => {
    setUsedParts(usedParts.filter((p) => p.partId !== partId));
  };

  const handleComplete = () => {
    completeMaintenanceWorkOrder(currentRecord.id, currentUserId, usedParts);
    setCompleteModal(false);
    setUsedParts([]);
  };

  const deviceRuntimeOption = {
    title: { text: '设备累计运行时长对比(h)', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
    xAxis: { type: 'category', data: devices.slice(0, 6).map((d) => d.deviceNo), axisLabel: { rotate: 30 } },
    yAxis: { type: 'value', name: '小时' },
    series: [
      {
        name: '累计运行',
        type: 'bar',
        data: devices.slice(0, 6).map((d) => d.accumulatedRuntimeHours),
        itemStyle: { color: '#1677ff' },
      },
    ],
  };

  return (
    <div>
      <div className="page-card">
        <div className="page-title">
          <Row justify="space-between" align="middle">
            <Col>
              <SettingOutlined style={{ marginRight: 8 }} />
              设备维保与备件管理中心
            </Col>
            <Col>
              <Space>
                <Button icon={<ReloadOutlined />} onClick={() => { checkAndGenerateMaintenanceOrders(); message.success('已重新检查设备维护周期'); }}>
                  检查维保周期
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCurrentRecord(null); setCreateOrderModal(true); }}>
                  新建维保工单
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={5}>
            <Card size="small" style={{ background: 'linear-gradient(135deg, #e6f4ff 0%, #91caff 100%)' }}>
              <Row align="middle" gutter={12}>
                <Avatar size={44} style={{ background: '#0958d9' }} icon={<ToolOutlined />} />
                <Col flex="auto">
                  <Statistic title="设备总数" value={devices.length} valueStyle={{ fontSize: 22, fontWeight: 700 }} />
                </Col>
              </Row>
            </Card>
          </Col>
          <Col span={5}>
            <Card size="small" style={{ background: 'linear-gradient(135deg, #fff1f0 0%, #ffa39e 100%)' }}>
              <Row align="middle" gutter={12}>
                <Avatar size={44} style={{ background: '#cf1322' }} icon={<AlertOutlined />} />
                <Col flex="auto">
                  <Statistic title="待处理工单" value={pendingOrders.length} valueStyle={{ fontSize: 22, fontWeight: 700 }} />
                </Col>
              </Row>
            </Card>
          </Col>
          <Col span={5}>
            <Card size="small" style={{ background: 'linear-gradient(135deg, #fff7e6 0%, #ffd591 100%)' }}>
              <Row align="middle" gutter={12}>
                <Avatar size={44} style={{ background: '#d46b08' }} icon={<SafetyOutlined />} />
                <Col flex="auto">
                  <Statistic title="滤网需更换" value={needFilterDevices.length} valueStyle={{ fontSize: 22, fontWeight: 700 }} />
                </Col>
              </Row>
            </Card>
          </Col>
          <Col span={5}>
            <Card size="small" style={{ background: 'linear-gradient(135deg, #ffccc7 0%, #ffa39e 100%)' }}>
              <Row align="middle" gutter={12}>
                <Avatar size={44} style={{ background: '#a8071a' }} icon={<FileProtectOutlined />} />
                <Col flex="auto">
                  <Statistic title="低库存备件" value={lowStockParts.length} valueStyle={{ fontSize: 22, fontWeight: 700 }} />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        {lowStockParts.length > 0 && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message="备件库存预警"
            description={
              <Space wrap>
                {lowStockParts.map((sp) => (
                  <Tag key={sp.id} color="red">
                    ⚠ {sp.name}: {sp.quantity}{sp.unit}/{sp.safetyStock}{sp.unit}
                  </Tag>
                ))}
              </Space>
            }
          />
        )}

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'workorders',
              label: (
                <Space>
                  <ToolOutlined />
                  维保工单
                  {pendingOrders.length > 0 && <Badge count={pendingOrders.length} />}
                </Space>
              ),
              children: (
                <Tabs
                  type="card"
                  items={[
                    {
                      key: 'pending',
                      label: `待处理 (${pendingOrders.length})`,
                      children: (
                        <Table
                          dataSource={pendingOrders}
                          columns={workOrderColumns}
                          rowKey="id"
                          scroll={{ x: 1200 }}
                          pagination={{ showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
                        />
                      ),
                    },
                    {
                      key: 'done',
                      label: `已完成 (${completedOrders.length})`,
                      children: (
                        <Table
                          dataSource={completedOrders}
                          columns={workOrderColumns}
                          rowKey="id"
                          scroll={{ x: 1200 }}
                          pagination={{ showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
                        />
                      ),
                    },
                  ]}
                />
              ),
            },
            {
              key: 'devices',
              label: (
                <Space>
                  <FileProtectOutlined />
                  设备档案
                </Space>
              ),
              children: (
                <div>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={14}>
                      <ReactECharts option={deviceRuntimeOption} style={{ height: 300 }} />
                    </Col>
                    <Col span={10}>
                      <Card title="设备分布概览" size="small">
                        <Row gutter={[8, 8]}>
                          {[
                            { type: 'biosafety_cabinet', label: '生物安全柜', color: 'blue' },
                            { type: 'laminar_flow_bench', label: '层流台', color: 'green' },
                            { type: 'pass_through', label: '传递窗', color: 'purple' },
                          ].map((cat) => {
                            const list = devices.filter((d) => d.type === cat.type);
                            return (
                              <Col span={24} key={cat.type}>
                                <Card size="small" style={{ borderLeft: `3px solid var(--ant-${cat.color})` }}>
                                  <Row justify="space-between" align="middle">
                                    <div>
                                      <Tag color={cat.color}>{cat.label}</Tag>
                                      <span style={{ fontWeight: 600 }}>{list.length} 台</span>
                                    </div>
                                    <Space>
                                      {list.slice(0, 4).map((d) => (
                                        <Tooltip key={d.id} title={d.name}>
                                          <Tag color={d.status === 'running' ? 'green' : d.status === 'maintenance' ? 'orange' : 'default'}>
                                            {d.deviceNo}
                                          </Tag>
                                        </Tooltip>
                                      ))}
                                    </Space>
                                  </Row>
                                </Card>
                              </Col>
                            );
                          })}
                        </Row>
                      </Card>
                    </Col>
                  </Row>
                  <Table
                    dataSource={devices}
                    columns={deviceColumns}
                    rowKey="id"
                    scroll={{ x: 1200 }}
                    pagination={{ showSizeChanger: true, showTotal: (total) => `共 ${total} 台设备` }}
                  />
                </div>
              ),
            },
            {
              key: 'parts',
              label: (
                <Space>
                  <FileProtectOutlined />
                  备件库存
                  {lowStockParts.length > 0 && <Badge count={lowStockParts.length} />}
                </Space>
              ),
              children: (
                <Table
                  dataSource={spareParts}
                  columns={partColumns}
                  rowKey="id"
                  scroll={{ x: 1100 }}
                  pagination={{ showSizeChanger: true, showTotal: (total) => `共 ${total} 种备件` }}
                />
              ),
            },
          ]}
        />
      </div>

      <Drawer
        title={detailType === 'device' ? '设备详情' : detailType === 'workorder' ? '维保工单详情' : '备件详情'}
        width={680}
        open={detailDrawer}
        onClose={() => setDetailDrawer(false)}
      >
        {detailType === 'device' && currentRecord && (
          <div>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="设备编号" span={2}>
                <code>{currentRecord.deviceNo}</code>
              </Descriptions.Item>
              <Descriptions.Item label="设备名称">{currentRecord.name}</Descriptions.Item>
              <Descriptions.Item label="型号">{currentRecord.model}</Descriptions.Item>
              <Descriptions.Item label="累计运行">{currentRecord.accumulatedRuntimeHours} 小时</Descriptions.Item>
              <Descriptions.Item label="所属工位">
                {workstations.find((w) => w.deviceId === currentRecord.id)?.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="上次维护">{currentRecord.lastMaintenanceDate}</Descriptions.Item>
              <Descriptions.Item label="下次维护">{currentRecord.nextMaintenanceDate}</Descriptions.Item>
              <Descriptions.Item label="HEPA寿命" span={2}>
                <Progress
                  percent={Math.round((currentRecord.hepaFilterRemainingHours / currentRecord.hepaFilterLifecycleHours) * 100)}
                  strokeColor={{ from: '#108ee9', to: '#87d068' }}
                />
                <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                  剩余 {currentRecord.hepaFilterRemainingHours}h / 总寿命 {currentRecord.hepaFilterLifecycleHours}h
                  （安装日期：{currentRecord.hepaFilterInstallDate}）
                </div>
              </Descriptions.Item>
              {currentRecord.currentFault && (
                <Descriptions.Item label="当前故障" span={2} style={{ background: '#fff2f0' }}>
                  <Alert type="error" message={currentRecord.currentFault} showIcon />
                </Descriptions.Item>
              )}
            </Descriptions>
            <Divider orientation="left">维护历史记录</Divider>
            {currentRecord.maintenanceHistory.length === 0 ? (
              <Empty description="暂无维护记录" />
            ) : (
              <Timeline
                items={currentRecord.maintenanceHistory.map((h: any) => ({
                  children: (
                    <div>
                      <strong>{h.date}</strong> <Tag>{h.type}</Tag>
                      <div style={{ fontSize: 12, color: '#595959' }}>{h.description}</div>
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>操作人：{h.operator}</div>
                    </div>
                  ),
                }))}
              />
            )}
          </div>
        )}

        {detailType === 'workorder' && currentRecord && (
          <div>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="工单号" span={2}>
                <code>{currentRecord.workOrderNo}</code>
              </Descriptions.Item>
              <Descriptions.Item label="优先级">{currentRecord.priority}</Descriptions.Item>
              <Descriptions.Item label="工单类型">{currentRecord.type}</Descriptions.Item>
              <Descriptions.Item label="关联设备">{currentRecord.deviceName}</Descriptions.Item>
              <Descriptions.Item label="处理班组">{currentRecord.assignedTeamName || '待分配'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{currentRecord.createdTime}</Descriptions.Item>
              <Descriptions.Item label="预计时间">{currentRecord.scheduledTime}</Descriptions.Item>
              <Descriptions.Item label="实际开始">{currentRecord.startedTime || '-'}</Descriptions.Item>
              <Descriptions.Item label="完成时间">{currentRecord.completedTime || '-'}</Descriptions.Item>
              <Descriptions.Item label="问题描述" span={2}>
                {currentRecord.description}
              </Descriptions.Item>
            </Descriptions>
            {currentRecord.usedParts?.length > 0 && (
              <>
                <Divider orientation="left">消耗备件</Divider>
                <Table
                  size="small"
                  dataSource={currentRecord.usedParts}
                  rowKey="partId"
                  pagination={false}
                  columns={[
                    { title: '备件名称', dataIndex: 'partName' },
                    { title: '数量', dataIndex: 'quantity', width: 100 },
                  ]}
                />
              </>
            )}
          </div>
        )}

        {detailType === 'part' && currentRecord && (
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="备件名称">{currentRecord.name}</Descriptions.Item>
            <Descriptions.Item label="备件编号">{currentRecord.partNo}</Descriptions.Item>
            <Descriptions.Item label="规格">{currentRecord.specification}</Descriptions.Item>
            <Descriptions.Item label="单位">{currentRecord.unit}</Descriptions.Item>
            <Descriptions.Item label="当前库存">
              <Tag color={currentRecord.quantity < currentRecord.safetyStock ? 'red' : 'green'}>
                {currentRecord.quantity} {currentRecord.unit}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="安全库存">{currentRecord.safetyStock} {currentRecord.unit}</Descriptions.Item>
            <Descriptions.Item label="上次补货">{currentRecord.lastRestockDate}</Descriptions.Item>
            <Descriptions.Item label="适用设备">
              {currentRecord.compatibleDevices.join('、')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      <Modal
        title="创建维保工单"
        open={createOrderModal}
        onCancel={() => setCreateOrderModal(false)}
        onOk={() => form.submit()}
        okText="创建"
        width={600}
      >
        <Form form={form} onFinish={handleCreateOrder} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="关联设备" name="deviceId" initialValue={currentRecord?.id} rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="label">
                  {devices.map((d) => (
                    <Select.Option key={d.id} value={d.id} label={d.name}>
                      {d.deviceNo} - {d.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="工单类型" name="type" rules={[{ required: true }]} initialValue="routine">
                <Select>
                  <Select.Option value="routine">常规保养</Select.Option>
                  <Select.Option value="repair">故障维修</Select.Option>
                  <Select.Option value="filter_replace">滤网更换</Select.Option>
                  <Select.Option value="pressure_check">压差校准</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="优先级" name="priority" rules={[{ required: true }]} initialValue="normal">
                <Select>
                  <Select.Option value="normal">普通</Select.Option>
                  <Select.Option value="urgent">加急</Select.Option>
                  <Select.Option value="emergency">紧急</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="计划时间" name="scheduledTime">
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="问题描述" name="description" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="请描述维保内容..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="分配维保人员/班组"
        open={assignModal}
        onCancel={() => setAssignModal(false)}
        onOk={() => assignForm.submit()}
        okText="确认分配"
      >
        <Form form={assignForm} onFinish={handleAssign} layout="vertical">
          <Form.Item label="选择维保人员" name="teamId" rules={[{ required: true, message: '请选择人员' }]}>
            <Select showSearch optionFilterProp="label" placeholder="请选择维保人员">
              {staff
                .filter((s) => s.role === 'maintenance')
                .map((s) => (
                  <Select.Option key={s.id} value={s.id} label={s.name}>
                    {s.name} ({s.employeeNo}) {s.isOnDuty ? <Tag color="green">在岗</Tag> : <Tag color="default">休假</Tag>}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="完成维保工单"
        open={completeModal}
        onCancel={() => setCompleteModal(false)}
        onOk={handleComplete}
        okText="确认完成"
        width={640}
      >
        <Alert type="success" showIcon message="确认完成本次维保？完成后将自动扣减消耗的备件库存并更新设备状态。" style={{ marginBottom: 16 }} />
        <Divider orientation="left" plain>备件消耗（可选）</Divider>
        <div style={{ marginBottom: 12 }}>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="选择使用的备件"
            value={usedParts.map((p) => p.partId)}
            onChange={(ids) => {
              const newParts = ids
                .filter((id) => !usedParts.find((p) => p.partId === id))
                .map((id) => {
                  const sp = spareParts.find((x) => x.id === id);
                  return { partId: id, partName: sp?.name || '', quantity: 1 };
                });
              setUsedParts([...usedParts.filter((p) => ids.includes(p.partId)), ...newParts]);
            }}
          >
            {spareParts.map((sp) => (
              <Select.Option key={sp.id} value={sp.id}>
                {sp.name} (库存: {sp.quantity}{sp.unit})
              </Select.Option>
            ))}
          </Select>
        </div>
        {usedParts.length > 0 && (
          <div style={{ border: '1px solid #f0f0f0', padding: 12, borderRadius: 6 }}>
            {usedParts.map((p) => (
              <Row key={p.partId} align="middle" style={{ marginBottom: 8 }}>
                <Col flex="auto">{p.partName}</Col>
                <Col span={8}>
                  <InputNumber min={1} value={p.quantity} onChange={(v) => handlePartQtyChange(p.partId, v || 1)} />
                </Col>
                <Col span={4}>
                  <Button type="text" danger onClick={() => handleRemovePart(p.partId)}>
                    移除
                  </Button>
                </Col>
              </Row>
            ))}
          </div>
        )}
      </Modal>

      <style>{`.ant-badge-count { margin-left: 4px; }`}</style>
    </div>
  );
};

export default DeviceMaintenance;
