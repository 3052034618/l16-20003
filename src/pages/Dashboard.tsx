import React from 'react';
import { Row, Col, Card, Progress, List, Avatar, Tag, Space, Table, Statistic, Badge } from 'antd';
import {
  FileTextOutlined,
  AuditOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  ToolOutlined,
  WarningOutlined,
  FireOutlined,
  TeamOutlined,
  DesktopOutlined,
  ClockCircleOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useAppStore } from '../store/useAppStore';
import dayjs from 'dayjs';

const Dashboard: React.FC = () => {
  const { prescriptions, maintenanceWorkOrders, workstations, devices, staff, notifications, getDashboardStats } = useAppStore();
  const stats = getDashboardStats();

  const today = dayjs().format('YYYY-MM-DD');
  const todayPrescriptions = prescriptions.filter((p) => p.scheduleTime.startsWith(today));

  const hourStats: Record<number, { count: number; error: number }> = {};
  for (let h = 7; h <= 22; h++) {
    hourStats[h] = { count: 0, error: 0 };
  }
  todayPrescriptions.forEach((p) => {
    const h = dayjs(p.scheduleTime).hour();
    if (h >= 7 && h <= 22) {
      hourStats[h].count++;
      if (p.errorRecord && p.errorRecord.length > 0) {
        hourStats[h].error++;
      }
    }
  });

  const zoneStats: Record<string, number> = {
    antibiotic_zone: 0,
    chemo_zone: 0,
    nutrition_zone: 0,
    general_zone: 0,
  };
  todayPrescriptions.forEach((p) => {
    if (zoneStats[p.zoneType] !== undefined) {
      zoneStats[p.zoneType]++;
    }
  });

  const overtimePrescriptions = prescriptions.filter((p) => {
    if (p.status !== 'dispensing') return false;
    if (!p.actualStartTime) return false;
    const started = dayjs(p.actualStartTime);
    const elapsed = dayjs().diff(started, 'minute');
    return elapsed > (p.expectedDuration + 30);
  });

  const statCards = [
    { title: '医嘱总数', value: stats.totalOrders, icon: <FileTextOutlined />, color: '#1677ff', suffix: '条' },
    { title: '待审核处方', value: stats.pendingReview, icon: <AuditOutlined />, color: '#faad14', suffix: '条' },
    { title: '调配中', value: stats.dispensing, icon: <ExperimentOutlined />, color: '#52c41a', suffix: '条' },
    { title: '今日已完成', value: stats.completedToday, icon: <CheckCircleOutlined />, color: '#13c2c2', suffix: '条' },
    { title: '待处理维保', value: stats.maintenancePending, icon: <ToolOutlined />, color: '#eb2f96', suffix: '项' },
    { title: '低库存预警', value: stats.lowStockCount, icon: <WarningOutlined />, color: '#f5222d', suffix: '项' },
    { title: '今日差错率', value: stats.errorRate, icon: <FireOutlined />, color: '#722ed1', suffix: '%' },
    { title: '人均效率', value: stats.avgEfficiency, icon: <TeamOutlined />, color: '#1890ff', suffix: '张/人' },
  ];

  const optionHourly = {
    title: { text: '今日各时段调配量趋势', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['调配数量', '差错数量'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '15%', containLabel: true },
    xAxis: { type: 'category', data: Object.keys(hourStats).map((h) => h + ':00') },
    yAxis: { type: 'value', name: '处方数' },
    series: [
      { name: '调配数量', type: 'bar', data: Object.values(hourStats).map((v) => v.count), itemStyle: { color: '#1677ff' }, barWidth: '40%' },
      { name: '差错数量', type: 'bar', data: Object.values(hourStats).map((v) => v.error), itemStyle: { color: '#ff4d4f' }, barWidth: '40%' },
    ],
  };

  const optionZone = {
    title: { text: '各分区今日调配占比', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item', formatter: '{b}: {c} 条 ({d}%)' },
    legend: { orient: 'vertical', left: 'left', top: 'middle' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        label: { show: true, formatter: '{b}\n{c}条' },
        data: [
          { value: zoneStats.antibiotic_zone, name: '抗生素区', itemStyle: { color: '#1677ff' } },
          { value: zoneStats.chemo_zone, name: '化疗药区', itemStyle: { color: '#eb2f96' } },
          { value: zoneStats.nutrition_zone, name: '营养区', itemStyle: { color: '#52c41a' } },
          { value: zoneStats.general_zone, name: '普通区', itemStyle: { color: '#faad14' } },
        ],
      },
    ],
  };

  const prescriptionColumns = [
    { title: '处方号', dataIndex: 'prescriptionNo', key: 'prescriptionNo', width: 160 },
    { title: '患者', dataIndex: ['patient', 'name'], key: 'patient', width: 80 },
    {
      title: '状态',
      key: 'status',
      width: 110,
      render: (_: any, record: any) => {
        const map: Record<string, { color: string; text: string }> = {
          pending_review: { color: 'gold', text: '待审核' },
          reviewed: { color: 'blue', text: '已审核' },
          rejected: { color: 'red', text: '已驳回' },
          dispensing: { color: 'cyan', text: '调配中' },
          checking: { color: 'purple', text: '核对中' },
          delivered: { color: 'green', text: '已配送' },
          adjustment_requested: { color: 'orange', text: '调适中' },
        };
        const s = map[record.status] || { color: 'default', text: record.status };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    { title: '工位', dataIndex: 'workstationName', key: 'workstationName', width: 140 },
    { title: '药师', dataIndex: 'assignedPharmacistName', key: 'pharmacist', width: 80 },
    { title: '计划时间', dataIndex: 'scheduleTime', key: 'scheduleTime', width: 160 },
  ];

  const maintenanceColumns = [
    { title: '工单号', dataIndex: 'workOrderNo', key: 'workOrderNo', width: 160 },
    { title: '设备', dataIndex: 'deviceName', key: 'deviceName', width: 160 },
    {
      title: '类型',
      key: 'type',
      width: 100,
      render: (_: any, record: any) => {
        const map: Record<string, { color: string; text: string }> = {
          routine: { color: 'blue', text: '常规保养' },
          repair: { color: 'red', text: '故障维修' },
          filter_replace: { color: 'purple', text: '滤网更换' },
          pressure_check: { color: 'cyan', text: '压差校准' },
        };
        const s = map[record.type] || { color: 'default', text: record.type };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: any, record: any) => {
        const map: Record<string, { color: string; text: string }> = {
          pending: { color: 'orange', text: '待分配' },
          in_progress: { color: 'blue', text: '进行中' },
          completed: { color: 'green', text: '已完成' },
        };
        const s = map[record.status] || { color: 'default', text: record.status };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    { title: '预计时间', dataIndex: 'scheduledTime', key: 'scheduledTime' },
  ];

  return (
    <div>
      {overtimePrescriptions.length > 0 && (
        <div className="warning-banner">
          <AlertOutlined style={{ fontSize: 20, color: '#faad14' }} />
          <span style={{ fontWeight: 600 }}>超时预警：</span>
          <span>
            当前有 <strong style={{ color: '#ff4d4f' }}>{overtimePrescriptions.length}</strong> 张处方调配超时，请及时处理
          </span>
        </div>
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {statCards.map((card, idx) => (
          <Col xs={12} sm={8} md={6} xl={3} key={idx}>
            <Card size="small" style={{ borderRadius: 8 }} bodyStyle={{ padding: '16px' }}>
              <Row align="middle" gutter={12}>
                <Col span={8}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: card.color + '22',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                      color: card.color,
                    }}
                  >
                    {card.icon}
                  </div>
                </Col>
                <Col span={16}>
                  <Statistic
                    value={card.value}
                    suffix={card.suffix}
                    valueStyle={{ fontSize: 22, fontWeight: 700, color: '#1f1f1f' }}
                  />
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>{card.title}</div>
                </Col>
              </Row>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={14}>
          <Card title="调配趋势分析" size="small">
            <ReactECharts option={optionHourly} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="分区调配分布" size="small">
            <ReactECharts option={optionZone} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={14}>
          <Card title="实时处方状态" size="small" extra={<span>共 {todayPrescriptions.length} 张处方</span>}>
            <Table
              dataSource={todayPrescriptions.slice(0, 8)}
              columns={prescriptionColumns}
              size="small"
              pagination={false}
              rowKey="id"
              scroll={{ x: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="工位忙闲状态" size="small">
            <List
              grid={{ gutter: 8, xs: 2, sm: 2, md: 2, lg: 2 }}
              dataSource={workstations}
              renderItem={(ws) => {
                const statusColor = ws.currentStatus === 'idle' ? '#52c41a' : ws.currentStatus === 'occupied' ? '#1677ff' : '#ff4d4f';
                const statusText = ws.currentStatus === 'idle' ? '空闲' : ws.currentStatus === 'occupied' ? '占用' : '维护';
                return (
                  <List.Item>
                    <Card size="small" style={{ borderLeft: `3px solid ${statusColor}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{ws.name}</div>
                          <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 4 }}>
                            <DesktopOutlined /> {ws.location}
                          </div>
                          <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                            <ClockCircleOutlined /> 压差 {ws.pressureDifferential}Pa
                          </div>
                        </div>
                        <Tag color={statusColor}>{statusText}</Tag>
                      </div>
                      <Progress
                        percent={Math.round(ws.utilizationRate * 100)}
                        size="small"
                        style={{ marginTop: 8 }}
                        strokeColor={statusColor}
                      />
                    </Card>
                  </List.Item>
                );
              }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="维保工单动态" size="small">
            <Table
              dataSource={maintenanceWorkOrders.slice(0, 5)}
              columns={maintenanceColumns}
              size="small"
              pagination={false}
              rowKey="id"
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <span>系统通知</span>
                <Badge count={notifications.filter((n) => !n.read).length} size="small" />
              </Space>
            }
            size="small"
          >
            <List
              itemLayout="horizontal"
              dataSource={notifications.slice(0, 6)}
              renderItem={(item) => {
                const iconMap: Record<string, React.ReactNode> = {
                  info: <InfoCircle style={{ color: '#1677ff' }} />,
                  warning: <WarningOutlined style={{ color: '#faad14' }} />,
                  error: <CloseCircleFilled style={{ color: '#ff4d4f' }} />,
                  success: <CheckCircleFilled style={{ color: '#52c41a' }} />,
                };
                return (
                  <List.Item style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <List.Item.Meta
                      avatar={<Avatar icon={iconMap[item.type]} style={{ background: 'transparent' }} size="small" />}
                      title={
                        <Space>
                          <span style={{ fontSize: 13 }}>{item.message}</span>
                          {!item.read && <Tag color="red" style={{ margin: 0 }}>新</Tag>}
                        </Space>
                      }
                      description={<span style={{ fontSize: 11, color: '#8c8c8c' }}>{item.time}</span>}
                    />
                  </List.Item>
                );
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

const InfoCircle = FileTextOutlined;
const CloseCircleFilled = ExperimentOutlined;
const CheckCircleFilled = CheckCircleOutlined;

export default Dashboard;
