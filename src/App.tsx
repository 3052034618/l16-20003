import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Badge, Space, Button, Tooltip, Drawer, List, Tag, Divider, Row, Col, Empty } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  ScheduleOutlined,
  AuditOutlined,
  ToolOutlined,
  ScanOutlined,
  BarChartOutlined,
  LayoutOutlined,
  UserOutlined,
  BellOutlined,
  LogoutOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  HeartOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import dayjs from 'dayjs';

import Dashboard from './pages/Dashboard';
import OrderManagement from './pages/OrderManagement';
import PrescriptionSchedule from './pages/PrescriptionSchedule';
import ApprovalWorkflow from './pages/ApprovalWorkflow';
import DeviceMaintenance from './pages/DeviceMaintenance';
import ProductCheck from './pages/ProductCheck';
import StatisticsAnalysis from './pages/StatisticsAnalysis';
import LayoutVisualization from './pages/LayoutVisualization';

const { Header, Sider, Content } = Layout;

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(dayjs().format('YYYY-MM-DD HH:mm:ss'));

  const {
    notifications,
    markNotificationRead,
    staff,
    currentUserId,
    orders,
    prescriptions,
    adjustmentRequests,
    addNotification,
  } = useAppStore();

  const currentUser = staff.find((s) => s.id === currentUserId);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const pendingOrders = orders.filter((o) => o.reviewStatus === 'pending').length;
  const pendingPrescriptions = prescriptions.filter((p) => p.status === 'pending_review').length;
  const pendingAdjustments = adjustmentRequests.filter((a) => a.status === 'pending').length;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs().format('YYYY-MM-DD HH:mm:ss'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      prescriptions.forEach((p) => {
        if (p.status === 'dispensing' && p.actualStartTime) {
          const elapsed = dayjs().diff(dayjs(p.actualStartTime), 'minute');
          if (elapsed > p.expectedDuration + 30) {
            const hasNotified = notifications.some(
              (n) => n.message.includes(p.prescriptionNo) && n.type === 'error'
            );
            if (!hasNotified) {
              addNotification('error', `超时预警：处方 ${p.prescriptionNo} 调配已超时 ${elapsed - p.expectedDuration} 分钟`);
            }
          }
        }
      });
    }, 5000);
    return () => clearTimeout(timeout);
  }, [prescriptions, notifications, addNotification]);

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '工作台总览',
    },
    {
      key: '/orders',
      icon: <FileTextOutlined />,
      label: pendingOrders > 0 ? (
        <Badge count={pendingOrders} size="small" offset={[6, -2]}>
          医嘱管理
        </Badge>
      ) : (
        '医嘱管理'
      ),
    },
    {
      key: '/schedule',
      icon: <ScheduleOutlined />,
      label: pendingPrescriptions > 0 ? (
        <Badge count={pendingPrescriptions} size="small" offset={[6, -2]}>
          智能排程
        </Badge>
      ) : (
        '智能排程'
      ),
    },
    {
      key: '/approval',
      icon: <AuditOutlined />,
      label: (pendingOrders + pendingPrescriptions + pendingAdjustments) > 0 ? (
        <Badge count={pendingOrders + pendingPrescriptions + pendingAdjustments} size="small" offset={[6, -2]}>
          审批流程
        </Badge>
      ) : (
        '审批流程'
      ),
    },
    {
      key: '/check',
      icon: <ScanOutlined />,
      label: '成品核对',
    },
    {
      key: '/maintenance',
      icon: <ToolOutlined />,
      label: '设备维保',
    },
    {
      key: '/layout',
      icon: <LayoutOutlined />,
      label: '可视化监控',
    },
    {
      key: '/statistics',
      icon: <BarChartOutlined />,
      label: '统计分析',
    },
  ];

  const selectedKey = location.pathname === '/' ? '/dashboard' : location.pathname;

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出系统',
      danger: true,
    },
  ];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'warning':
        return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#1677ff' }} />;
    }
  };

  return (
    <Layout className="app-layout">
      <Sider
        className="app-sider"
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={230}
        style={{ boxShadow: '2px 0 8px rgba(0,0,0,0.08)' }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? 0 : '0 16px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            marginBottom: 8,
          }}
        >
          <HeartOutlined
            style={{
              fontSize: collapsed ? 28 : 24,
              color: '#1677ff',
              marginRight: collapsed ? 0 : 10,
            }}
          />
          {!collapsed && (
            <div>
              <div style={{ color: 'white', fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>
                PIVAS
              </div>
              <div style={{ color: '#91caff', fontSize: 11, lineHeight: 1.2 }}>
                智能调度管理系统
              </div>
            </div>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
        {!collapsed && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: 16,
              borderTop: '1px solid rgba(255,255,255,0.1)',
              color: '#8c8c8c',
              fontSize: 11,
            }}
          >
            <div style={{ textAlign: 'center' }}>版本 v1.0.0</div>
            <div style={{ textAlign: 'center', marginTop: 4 }}>
              © 2025 医院信息中心
            </div>
          </div>
        )}
      </Sider>
      <Layout>
        <Header className="app-header" style={{ padding: '0 16px', height: 64, lineHeight: '64px' }}>
          <Row justify="space-between" align="middle" style={{ height: '100%' }}>
            <Col>
              <Space size="large">
                <Button
                  type="text"
                  icon={collapsed ? <HomeOutlined style={{ color: 'white', fontSize: 18 }} /> : <ReloadOutlined style={{ color: 'white', fontSize: 18 }} />}
                  onClick={() => setCollapsed(!collapsed)}
                  style={{ color: 'white' }}
                />
                {!collapsed && (
                  <div style={{ color: 'white' }}>
                    <span style={{ opacity: 0.8, marginRight: 8 }}>📍</span>
                    <span style={{ fontWeight: 500 }}>
                      {menuItems.find((m) => m.key === selectedKey)?.label?.toString()?.replace(/<[^>]+>/g, '') || '工作台总览'}
                    </span>
                  </div>
                )}
              </Space>
            </Col>
            <Col>
              <Space size="large">
                <div style={{ color: '#fff', fontSize: 14, fontFamily: 'monospace' }}>
                  🕐 {currentTime}
                </div>

                <Tooltip title="刷新数据">
                  <Button
                    type="text"
                    icon={<ReloadOutlined style={{ color: 'white', fontSize: 16 }} />}
                    onClick={() => window.location.reload()}
                  />
                </Tooltip>

                <Badge count={unreadCount} size="small">
                  <Button
                    type="text"
                    icon={<BellOutlined style={{ color: 'white', fontSize: 18 }} />}
                    onClick={() => setNotificationOpen(true)}
                  />
                </Badge>

                <Tooltip title="系统帮助">
                  <Button type="text" icon={<InfoCircleOutlined style={{ color: 'white', fontSize: 18 }} />} />
                </Tooltip>

                <Dropdown
                  menu={{ items: userMenuItems }}
                  placement="bottomRight"
                  trigger={['click']}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      padding: '0 8px',
                      borderRadius: 6,
                      background: 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <Avatar
                      size="small"
                      style={{
                        background: currentUser?.role === 'director'
                          ? '#722ed1'
                          : currentUser?.role === 'pharmacist_reviewer'
                          ? '#1677ff'
                          : '#52c41a',
                      }}
                      icon={<UserOutlined />}
                    />
                    {!collapsed && (
                      <div style={{ lineHeight: 1.2 }}>
                        <div style={{ color: 'white', fontSize: 13, fontWeight: 500 }}>
                          {currentUser?.name || '用户'}
                        </div>
                        <div style={{ color: '#91caff', fontSize: 10 }}>
                          {(
                            {
                              pharmacist_reviewer: '审方药师',
                              pharmacist_dispenser: '调配药师',
                              nurse: '护士',
                              director: '药学部主任',
                              maintenance: '维修工程师',
                            } as Record<string, string>
                          )[currentUser?.role || 'pharmacist_reviewer']}
                        </div>
                      </div>
                    )}
                  </div>
                </Dropdown>
              </Space>
            </Col>
          </Row>
        </Header>

        <Content className="app-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/orders" element={<OrderManagement />} />
            <Route path="/schedule" element={<PrescriptionSchedule />} />
            <Route path="/approval" element={<ApprovalWorkflow />} />
            <Route path="/check" element={<ProductCheck />} />
            <Route path="/maintenance" element={<DeviceMaintenance />} />
            <Route path="/layout" element={<LayoutVisualization />} />
            <Route path="/statistics" element={<StatisticsAnalysis />} />
          </Routes>
        </Content>
      </Layout>

      <Drawer
        title={
          <Space>
            <BellOutlined />
            系统通知中心
            <Tag color="red">{unreadCount} 条未读</Tag>
          </Space>
        }
        placement="right"
        width={420}
        open={notificationOpen}
        onClose={() => setNotificationOpen(false)}
        extra={
          <Space>
            <Button
              size="small"
              onClick={() => {
                notifications.forEach((n) => !n.read && markNotificationRead(n.id));
              }}
            >
              全部已读
            </Button>
            <Button type="primary" size="small">
              通知设置
            </Button>
          </Space>
        }
      >
        <Divider orientation="left" plain style={{ margin: '8px 0 16px' }}>
          实时预警与通知
        </Divider>
        {notifications.length === 0 ? (
          <Empty description="暂无通知" />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={notifications}
            renderItem={(item) => (
              <List.Item
                onClick={() => markNotificationRead(item.id)}
                style={{
                  background: !item.read ? '#f0f7ff' : 'transparent',
                  borderRadius: 6,
                  marginBottom: 6,
                  padding: 12,
                  cursor: 'pointer',
                  border: !item.read ? '1px solid #91caff' : '1px solid transparent',
                }}
              >
                <List.Item.Meta
                  avatar={
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        background:
                          item.type === 'error'
                            ? '#fff1f0'
                            : item.type === 'warning'
                            ? '#fff7e6'
                            : item.type === 'success'
                            ? '#f6ffed'
                            : '#e6f4ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                      }}
                    >
                      {getNotificationIcon(item.type)}
                    </div>
                  }
                  title={
                    <Space>
                      <span style={{ fontSize: 13, fontWeight: !item.read ? 600 : 400 }}>
                        {item.message}
                      </span>
                      {!item.read && <Tag color="red" style={{ margin: 0 }}>NEW</Tag>}
                    </Space>
                  }
                  description={
                    <Space size="large">
                      <span style={{ fontSize: 11, color: '#8c8c8c' }}>{item.time}</span>
                      <Tag
                        color={
                          item.type === 'error'
                            ? 'red'
                            : item.type === 'warning'
                            ? 'orange'
                            : item.type === 'success'
                            ? 'green'
                            : 'blue'
                        }
                        style={{ margin: 0 }}
                      >
                        {item.type === 'error' ? '严重' : item.type === 'warning' ? '警告' : item.type === 'success' ? '成功' : '信息'}
                      </Tag>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Drawer>

      <style>{`
        .ant-row {
          display: flex;
          flex-flow: row wrap;
        }
        .ant-col {
          display: block;
        }
      `}</style>
    </Layout>
  );
};

export default App;
