import React, { useState, useMemo } from 'react';
import {
  Row,
  Col,
  Card,
  Tabs,
  Tag,
  Statistic,
  Tooltip,
  Badge,
  Progress,
  Button,
  Space,
  Divider,
  Drawer,
  Descriptions,
  List,
  Avatar,
  Empty,
  Alert,
} from 'antd';
import {
  LayoutOutlined,
  DesktopOutlined,
  FireOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  UserOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
  FullscreenOutlined,
  SafetyOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useAppStore } from '../store/useAppStore';
import { Workstation, ZoneType } from '../types';
import dayjs from 'dayjs';

const LayoutVisualization: React.FC = () => {
  const { workstations, staff, prescriptions, devices } = useAppStore();
  const [selectedWs, setSelectedWs] = useState<Workstation | null>(null);
  const [detailDrawer, setDetailDrawer] = useState(false);
  const [viewMode, setViewMode] = useState<'layout' | 'heatmap'>('layout');

  const zoneConfig: Record<ZoneType, { label: string; color: string; bg: string; borderColor: string }> = {
    antibiotic_zone: { label: '抗生素调配区', color: '#1677ff', bg: '#e6f4ff', borderColor: '#1677ff' },
    chemo_zone: { label: '化疗药调配区', color: '#eb2f96', bg: '#fff0f6', borderColor: '#eb2f96' },
    nutrition_zone: { label: '营养液调配区', color: '#52c41a', bg: '#f6ffed', borderColor: '#52c41a' },
    general_zone: { label: '普通药品调配区', color: '#faad14', bg: '#fffbe6', borderColor: '#faad14' },
  };

  const zonePositions = useMemo(() => {
    const zones: (ZoneType)[] = ['antibiotic_zone', 'chemo_zone', 'nutrition_zone', 'general_zone'];
    return zones.map((z, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      return {
        zone: z,
        x: 20 + col * 460,
        y: 20 + row * 180,
        width: 440,
        height: 160,
      };
    });
  }, []);

  const getWsPressureStatus = (ws: Workstation) => {
    const diff = ws.pressureDifferential - ws.requiredPressureDifferential;
    if (diff >= 2) return { color: '#52c41a', text: '达标', level: 'success' };
    if (diff >= 0) return { color: '#faad14', text: '临界', level: 'warning' };
    return { color: '#ff4d4f', text: '不达标', level: 'error' };
  };

  const heatmapData = useMemo(() => {
    const data: number[][] = [];
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 5; y++) {
        const distToWs = workstations.map((ws) => {
          const wsX = Math.round((ws.positionX / 500) * 10);
          const wsY = Math.round((ws.positionY / 400) * 5);
          return Math.sqrt((x - wsX) ** 2 + (y - wsY) ** 2);
        });
        const minDist = Math.min(...distToWs);
        const nearestIdx = distToWs.indexOf(minDist);
        const ws = workstations[nearestIdx];
        const utilValue = minDist < 1.5 ? ws.utilizationRate * 10 : 0;
        data.push([x, y, Math.round(utilValue)]);
      }
    }
    return data;
  }, [workstations]);

  const heatmapOption = {
    title: {
      text: '工位忙闲热力分布',
      subtext: '颜色越深表示利用率越高',
      left: 'center',
    },
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        return `繁忙指数: <strong>${params.value[2]}/10</strong>`;
      },
    },
    grid: { left: '10%', right: '10%', top: '15%', bottom: '15%' },
    xAxis: {
      type: 'category',
      data: ['', '', '', '', '', '', '', '', '', ''],
      splitArea: { show: true },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'category',
      data: ['北', '', '', '', '南'],
      splitArea: { show: true },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    visualMap: {
      min: 0,
      max: 10,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      inRange: {
        color: ['#52c41a', '#95de64', '#ffec3d', '#ffbb96', '#ff4d4f', '#a8071a'],
      },
    },
    series: [
      {
        name: '忙闲度',
        type: 'heatmap',
        data: heatmapData,
        label: { show: false },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' },
        },
      },
    ],
  };

  const wsPrescriptions = useMemo(() => {
    const map: Record<string, any[]> = {};
    prescriptions.forEach((p) => {
      if (p.workstationId) {
        if (!map[p.workstationId]) map[p.workstationId] = [];
        map[p.workstationId].push(p);
      }
    });
    return map;
  }, [prescriptions]);

  const wsStaff = useMemo(() => {
    const map: Record<string, any> = {};
    staff.forEach((s) => {
      if (s.currentWorkstationId) {
        map[s.currentWorkstationId] = s;
      }
    });
    return map;
  }, [staff]);

  const handleWsClick = (ws: Workstation) => {
    setSelectedWs(ws);
    setDetailDrawer(true);
  };

  const renderWorkstation = (ws: Workstation) => {
    const cfg = zoneConfig[ws.zoneType];
    const ps = getWsPressureStatus(ws);
    const presList = wsPrescriptions[ws.id] || [];
    const assignedStaff = wsStaff[ws.id];
    const statusColor = ws.currentStatus === 'idle' ? '#52c41a' : ws.currentStatus === 'occupied' ? '#1677ff' : '#ff4d4f';
    const statusText = ws.currentStatus === 'idle' ? '空闲' : ws.currentStatus === 'occupied' ? '使用中' : '维护中';
    const pulse = ws.currentStatus === 'occupied';

    return (
      <g
        key={ws.id}
        transform={`translate(${ws.positionX + 10}, ${ws.positionY + 35})`}
        style={{ cursor: 'pointer' }}
        onClick={() => handleWsClick(ws)}
      >
        {pulse && (
          <rect
            x="-2"
            y="-2"
            width={ws.width + 4}
            height={ws.height + 4}
            fill="none"
            stroke="#1677ff"
            strokeWidth="2"
            opacity="0.5"
            rx="6"
          >
            <animate attributeName="opacity" values="0.1;0.6;0.1" dur="2s" repeatCount="indefinite" />
            <animate attributeName="width" values={`${ws.width + 4};${ws.width + 20};${ws.width + 4}`} dur="2s" repeatCount="indefinite" />
            <animate attributeName="height" values={`${ws.height + 4};${ws.height + 20};${ws.height + 4}`} dur="2s" repeatCount="indefinite" />
            <animate attributeName="x" values="-2;-10;-2" dur="2s" repeatCount="indefinite" />
            <animate attributeName="y" values="-2;-10;-2" dur="2s" repeatCount="indefinite" />
          </rect>
        )}
        <rect
          width={ws.width}
          height={ws.height}
          rx="6"
          fill={ws.currentStatus === 'maintenance' ? '#fff1f0' : '#ffffff'}
          stroke={statusColor}
          strokeWidth="2"
          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
        />
        <rect x="0" y="0" width={ws.width} height="8" fill={statusColor} rx="6" />
        <rect x="0" y="0" width={ws.width} height="8" fill={statusColor} />

        <text x="8" y="24" fontSize="11" fontWeight="bold" fill="#1f1f1f">
          {ws.name}
        </text>
        <text x="8" y="40" fontSize="9" fill="#8c8c8c">
          {ws.type === 'biosafety_cabinet' ? '生物安全柜' : '层流洁净台'}
        </text>

        <g transform={`translate(${ws.width - 14}, 12)`}>
          <circle r="3" fill={ps.color} />
        </g>

        {assignedStaff && (
          <g transform={`translate(8, 52)`}>
            <text fontSize="9" fill="#1677ff">
              👤 {assignedStaff.name}
            </text>
          </g>
        )}

        <g transform={`translate(8, ${ws.height - 12})`}>
          <rect width="60" height="6" rx="3" fill="#f0f0f0" />
          <rect
            width={60 * ws.utilizationRate}
            height="6"
            rx="3"
            fill={ws.utilizationRate > 0.85 ? '#ff4d4f' : ws.utilizationRate > 0.7 ? '#faad14' : '#52c41a'}
          />
          <text x="65" y="6" fontSize="8" fill="#595959">
            {Math.round(ws.utilizationRate * 100)}%
          </text>
        </g>

        {presList.filter((p) => ['dispensing', 'checking'].includes(p.status)).length > 0 && (
          <g transform={`translate(${ws.width - 22}, ${ws.height - 12})`}>
            <circle r="8" fill="#eb2f96" />
            <text x="-3" y="4" fill="white" fontSize="10" fontWeight="bold">
              {presList.filter((p) => ['dispensing', 'checking'].includes(p.status)).length}
            </text>
          </g>
        )}
      </g>
    );
  };

  const zoneStats = useMemo(() => {
    const stats: Record<string, { total: number; occupied: number; idle: number; maintenance: number; avgUtil: number }> = {};
    (['antibiotic_zone', 'chemo_zone', 'nutrition_zone', 'general_zone'] as ZoneType[]).forEach((z) => {
      const list = workstations.filter((w) => w.zoneType === z);
      stats[z] = {
        total: list.length,
        occupied: list.filter((w) => w.currentStatus === 'occupied').length,
        idle: list.filter((w) => w.currentStatus === 'idle').length,
        maintenance: list.filter((w) => w.currentStatus === 'maintenance').length,
        avgUtil: list.length > 0 ? list.reduce((s, w) => s + w.utilizationRate, 0) / list.length : 0,
      };
    });
    return stats;
  }, [workstations]);

  return (
    <div>
      <div className="page-card">
        <div className="page-title">
          <Row justify="space-between" align="middle">
            <Col>
              <LayoutOutlined style={{ marginRight: 8 }} />
              科室布局可视化与实时监控
            </Col>
            <Col>
              <Space>
                <Button.Group>
                  <Button
                    type={viewMode === 'layout' ? 'primary' : 'default'}
                    icon={<LayoutOutlined />}
                    onClick={() => setViewMode('layout')}
                  >
                    平面图
                  </Button>
                  <Button
                    type={viewMode === 'heatmap' ? 'primary' : 'default'}
                    icon={<FireOutlined />}
                    onClick={() => setViewMode('heatmap')}
                  >
                    热力图
                  </Button>
                </Button.Group>
                <Button icon={<ReloadOutlined />}>刷新</Button>
                <Button icon={<FullscreenOutlined />}>全屏</Button>
                <Button icon={<PrinterOutlined />}>打印</Button>
              </Space>
            </Col>
          </Row>
        </div>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={18}>
            <Card
              size="small"
              title={
                <Space>
                  <EnvironmentOutlined />
                  PIVAS 洁净区平面布局图
                  <span style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 'normal' }}>
                    (点击工位查看详情)
                  </span>
                </Space>
              }
              extra={
                <Space>
                  <Tag color="green" icon={<CheckCircleOutlined />}>
                    空闲
                  </Tag>
                  <Tag color="blue" icon={<DesktopOutlined />}>
                    使用中
                  </Tag>
                  <Tag color="red" icon={<WarningOutlined />}>
                    维护中
                  </Tag>
                </Space>
              }
              style={{ minHeight: 500 }}
            >
              {viewMode === 'layout' ? (
                <div style={{ position: 'relative', width: '100%', overflow: 'auto' }}>
                  <svg viewBox="0 0 940 400" style={{ width: '100%', maxWidth: 940, background: '#fafafa', borderRadius: 8, border: '1px solid #e8e8e8' }}>
                    <defs>
                      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="0.5" />
                      </pattern>
                    </defs>
                    <rect width="940" height="400" fill="url(#grid)" />

                    <g transform="translate(0, 0)">
                      <rect
                        x="10"
                        y="10"
                        width="920"
                        height="380"
                        fill="#fafafa"
                        stroke="#1677ff"
                        strokeWidth="2"
                        strokeDasharray="5,3"
                        rx="10"
                      />
                      <text x="470" y="28" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1677ff">
                        PIVAS 静脉用药调配中心 · 洁净区
                      </text>

                      {zonePositions.map((zp) => {
                        const cfg = zoneConfig[zp.zone as ZoneType];
                        const stat = zoneStats[zp.zone];
                        return (
                          <g key={zp.zone} transform={`translate(${zp.x}, ${zp.y})`}>
                            <rect
                              width={zp.width}
                              height={zp.height}
                              rx="8"
                              fill={cfg.bg}
                              stroke={cfg.borderColor}
                              strokeWidth="1.5"
                              strokeDasharray="4,2"
                              opacity="0.6"
                            />
                            <rect x="10" y="5" width={150} height="18" rx="4" fill={cfg.color} />
                            <text x="85" y="18" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                              {cfg.label}
                            </text>
                            <text x={zp.width - 10} y="18" textAnchor="end" fontSize="10" fill={cfg.color}>
                              空闲{stat.idle}/使用{stat.occupied}/维护{stat.maintenance}
                            </text>
                            <rect x={zp.width - 100} y="24" width="80" height="4" fill="#f0f0f0" />
                            <rect
                              x={zp.width - 100}
                              y="24"
                              width={80 * stat.avgUtil}
                              height="4"
                              fill={cfg.color}
                            />
                            <text x={zp.width - 15} y="31" textAnchor="end" fontSize="8" fill="#595959">
                              均{Math.round(stat.avgUtil * 100)}%
                            </text>
                          </g>
                        );
                      })}

                      {workstations.map(renderWorkstation)}

                      <g transform="translate(770, 370)">
                        <rect width="150" height="20" rx="4" fill="rgba(0,0,0,0.05)" />
                        <text x="75" y="14" textAnchor="middle" fontSize="10" fill="#8c8c8c">
                          📍 缓冲区 / 更衣室 方向 →
                        </text>
                      </g>
                    </g>
                  </svg>
                </div>
              ) : (
                <div style={{ height: 500 }}>
                  <ReactECharts option={heatmapOption} style={{ height: '100%' }} />
                </div>
              )}
            </Card>
          </Col>

          <Col span={6}>
            <Card size="small" title={<Space><SafetyOutlined />洁净区压差监控</Space>} style={{ marginBottom: 16 }}>
              <List
                size="small"
                dataSource={workstations}
                renderItem={(ws) => {
                  const ps = getWsPressureStatus(ws);
                  return (
                    <List.Item
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleWsClick(ws)}
                    >
                      <Row justify="space-between" style={{ width: '100%' }} align="middle">
                        <Col>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{ws.name}</div>
                          <div style={{ fontSize: 10, color: '#8c8c8c' }}>{ws.location}</div>
                        </Col>
                        <Col>
                          <Space>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 16, fontWeight: 700, color: ps.color }}>
                                {ws.pressureDifferential}Pa
                              </div>
                              <div style={{ fontSize: 10, color: '#8c8c8c' }}>≥{ws.requiredPressureDifferential}Pa</div>
                            </div>
                            <Badge status={ps.level as any} text={ps.text} />
                          </Space>
                        </Col>
                      </Row>
                    </List.Item>
                  );
                }}
              />
            </Card>

            <Card size="small" title={<Space><TeamOutlined />实时在岗人员</Space>}>
              <List
                size="small"
                dataSource={staff.filter((s) => s.isOnDuty)}
                renderItem={(s) => (
                  <List.Item>
                    <Row justify="space-between" style={{ width: '100%' }} align="middle">
                      <Col>
                        <Space>
                          <Avatar size="small" style={{ background: s.role === 'director' ? '#722ed1' : s.role === 'pharmacist_reviewer' ? '#1677ff' : s.role === 'pharmacist_dispenser' ? '#52c41a' : '#13c2c2' }} icon={<UserOutlined />} />
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{s.name}</div>
                            <div style={{ fontSize: 10, color: '#8c8c8c' }}>
                              {({
                                pharmacist_reviewer: '审核药师',
                                pharmacist_dispenser: '调配药师',
                                nurse: '护士',
                                director: '主任',
                                maintenance: '维修',
                              } as any)[s.role]}
                            </div>
                          </div>
                        </Space>
                      </Col>
                      <Col>
                        <Space direction="vertical" size={0} style={{ alignItems: 'flex-end' }}>
                          <Tag color="blue" style={{ margin: 0 }}>
                            {s.dailyDispenseCount}张
                          </Tag>
                          <span style={{ fontSize: 10, color: '#8c8c8c' }}>
                            {Math.floor(s.dailyWorkingMinutes / 60)}h{s.dailyWorkingMinutes % 60}m
                          </span>
                        </Space>
                      </Col>
                    </Row>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>

        <Divider orientation="left" plain>
          各分区运行状态
        </Divider>
        <Row gutter={16}>
          {(['antibiotic_zone', 'chemo_zone', 'nutrition_zone', 'general_zone'] as ZoneType[]).map((z) => {
            const cfg = zoneConfig[z];
            const stat = zoneStats[z];
            const list = workstations.filter((w) => w.zoneType === z);
            return (
              <Col span={6} key={z}>
                <Card
                  size="small"
                  style={{ borderTop: `3px solid ${cfg.color}` }}
                  title={<Tag color={cfg.color}>{cfg.label}</Tag>}
                >
                  <Row gutter={8}>
                    <Col span={8}>
                      <Statistic title="工位总数" value={stat.total} valueStyle={{ fontSize: 18 }} />
                    </Col>
                    <Col span={8}>
                      <Statistic title="空闲" value={stat.idle} valueStyle={{ fontSize: 18, color: '#52c41a' }} />
                    </Col>
                    <Col span={8}>
                      <Statistic title="使用中" value={stat.occupied} valueStyle={{ fontSize: 18, color: '#1677ff' }} />
                    </Col>
                  </Row>
                  <div style={{ marginTop: 8 }}>
                    <Progress
                      percent={Math.round(stat.avgUtil * 100)}
                      strokeColor={cfg.color}
                      size="small"
                    />
                    <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 4 }}>
                      平均利用率
                      {list.filter((w) => w.pressureDifferential < w.requiredPressureDifferential).length > 0 && (
                        <Tooltip title="存在压差不达标的工位">
                          <Tag color="red" style={{ float: 'right', margin: 0 }}>
                            <WarningOutlined /> 压差告警
                          </Tag>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      </div>

      <Drawer
        title={
          selectedWs ? (
            <Space>
              <DesktopOutlined style={{ color: zoneConfig[selectedWs.zoneType].color }} />
              {selectedWs.name}
              <Tag color={zoneConfig[selectedWs.zoneType].color}>{zoneConfig[selectedWs.zoneType].label}</Tag>
            </Space>
          ) : '工位详情'
        }
        width={560}
        open={detailDrawer}
        onClose={() => setDetailDrawer(false)}
      >
        {selectedWs && (
          <div>
            <Alert
              type={
                selectedWs.currentStatus === 'idle'
                  ? 'success'
                  : selectedWs.currentStatus === 'occupied'
                  ? 'info'
                  : 'warning'
              }
              showIcon
              message={
                selectedWs.currentStatus === 'idle'
                  ? '工位当前空闲，可分配处方'
                  : selectedWs.currentStatus === 'occupied'
                  ? '工位正在使用中'
                  : '工位处于维护状态，暂不可用'
              }
              style={{ marginBottom: 16 }}
            />

            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="工位编号">{selectedWs.id}</Descriptions.Item>
              <Descriptions.Item label="工位名称" span={1}>
                {selectedWs.name}
              </Descriptions.Item>
              <Descriptions.Item label="设备类型">
                {selectedWs.type === 'biosafety_cabinet' ? '生物安全柜' : '层流洁净台'}
              </Descriptions.Item>
              <Descriptions.Item label="所在分区">{zoneConfig[selectedWs.zoneType].label}</Descriptions.Item>
              <Descriptions.Item label="位置">{selectedWs.location}</Descriptions.Item>
              <Descriptions.Item label="关联设备">
                {devices.find((d) => d.id === selectedWs.deviceId)?.deviceNo}
              </Descriptions.Item>
              <Descriptions.Item label="当前状态">
                <Tag
                  color={
                    selectedWs.currentStatus === 'idle'
                      ? 'green'
                      : selectedWs.currentStatus === 'occupied'
                      ? 'blue'
                      : 'orange'
                  }
                >
                  {selectedWs.currentStatus === 'idle' ? '空闲' : selectedWs.currentStatus === 'occupied' ? '占用' : '维护'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="压差监测" span={1}>
                <Space>
                  <span
                    style={{
                      fontWeight: 700,
                      color:
                        selectedWs.pressureDifferential >= selectedWs.requiredPressureDifferential
                          ? '#52c41a'
                          : '#ff4d4f',
                    }}
                  >
                    {selectedWs.pressureDifferential} Pa
                  </span>
                  <span style={{ color: '#8c8c8c' }}>
                    (≥ {selectedWs.requiredPressureDifferential} Pa)
                  </span>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="今日利用率" span={2}>
                <Progress
                  percent={Math.round(selectedWs.utilizationRate * 100)}
                  status={selectedWs.utilizationRate > 0.9 ? 'exception' : undefined}
                />
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">设备信息</Divider>
            {(() => {
              const d = devices.find((dv) => dv.id === selectedWs.deviceId);
              if (!d) return <Empty description="未绑定设备" />;
              return (
                <Descriptions bordered size="small" column={2}>
                  <Descriptions.Item label="设备编号">{d.deviceNo}</Descriptions.Item>
                  <Descriptions.Item label="型号">{d.model}</Descriptions.Item>
                  <Descriptions.Item label="累计运行">{d.accumulatedRuntimeHours} 小时</Descriptions.Item>
                  <Descriptions.Item label="运行状态">
                    <Tag
                      color={
                        d.status === 'running' ? 'green' : d.status === 'maintenance' ? 'orange' : 'default'
                      }
                    >
                      {{ running: '运行中', idle: '空闲', maintenance: '维护中', fault: '故障' }[d.status]}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="HEPA剩余" span={2}>
                    <Progress
                      percent={Math.round((d.hepaFilterRemainingHours / d.hepaFilterLifecycleHours) * 100)}
                      strokeColor={{ from: '#108ee9', to: '#87d068' }}
                    />
                    <span style={{ fontSize: 11, color: '#8c8c8c' }}>
                      剩余 {d.hepaFilterRemainingHours}h / 寿命 {d.hepaFilterLifecycleHours}h
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="下次维护">{d.nextMaintenanceDate}</Descriptions.Item>
                  <Descriptions.Item label="上次维护">{d.lastMaintenanceDate}</Descriptions.Item>
                </Descriptions>
              );
            })()}

            <Divider orientation="left">今日关联处方 ({(wsPrescriptions[selectedWs.id] || []).length || 0})</Divider>
            {(wsPrescriptions[selectedWs.id] || []).length === 0 ? (
              <Empty description="今日暂无处方" />
            ) : (
              <List
                size="small"
                dataSource={wsPrescriptions[selectedWs.id].slice(0, 5)}
                renderItem={(p) => (
                  <List.Item>
                    <Row justify="space-between" style={{ width: '100%' }}>
                      <Col>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>
                          <code>{p.prescriptionNo}</code>
                        </div>
                        <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                          👤 {p.patient.name} · 💊 {p.items.length}种药
                        </div>
                      </Col>
                      <Col>
                        <Tag
                          color={
                            p.status === 'delivered'
                              ? 'green'
                              : p.status === 'dispensing'
                              ? 'cyan'
                              : p.status === 'checking'
                              ? 'purple'
                              : 'gold'
                          }
                        >
                          {{
                            pending_review: '待审核',
                            reviewed: '已审核',
                            dispensing: '调配中',
                            checking: '核对中',
                            delivered: '已配送',
                          }[p.status] || p.status}
                        </Tag>
                      </Col>
                    </Row>
                  </List.Item>
                )}
              />
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default LayoutVisualization;
