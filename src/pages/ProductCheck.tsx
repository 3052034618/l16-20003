import React, { useState, useRef } from 'react';
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
  Card,
  Form,
  Input,
  InputNumber,
  Result,
  Steps,
  Divider,
  Statistic,
  Avatar,
  Alert,
  Empty,
  Progress,
  Tabs,
  Badge,
} from 'antd';
import {
  ScanOutlined,
  QrcodeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  SendOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  PrinterOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../store/useAppStore';
import { Prescription } from '../types';
import dayjs from 'dayjs';

const ProductCheck: React.FC = () => {
  const { prescriptions, updatePrescriptionStatus, staff, currentUserId } = useAppStore();
  const [scanInput, setScanInput] = useState('');
  const [scannedPrescription, setScannedPrescription] = useState<Prescription | null>(null);
  const [checkStep, setCheckStep] = useState(0);
  const [form] = Form.useForm();
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [errorReportModal, setErrorReportModal] = useState(false);
  const [currentErrorPrescription, setCurrentErrorPrescription] = useState<Prescription | null>(null);
  const scanInputRef = useRef<any>(null);

  const checkingPrescriptions = prescriptions.filter((p) => p.status === 'checking');
  const checkedToday = prescriptions.filter(
    (p) => p.status === 'delivered' && (p.actualEndTime || '').startsWith(dayjs().format('YYYY-MM-DD'))
  );
  const errorPrescriptions = prescriptions.filter((p) => p.errorRecord && p.errorRecord.length > 0);

  const handleScan = () => {
    if (!scanInput.trim()) {
      message.warning('请输入或扫描条码');
      return;
    }
    const found = prescriptions.find((p) => p.prescriptionNo === scanInput || p.barcode === scanInput);
    if (found) {
      setScannedPrescription(found);
      setCheckStep(0);
      setScanHistory([
        {
          id: Date.now(),
          prescriptionNo: found.prescriptionNo,
          patientName: found.patient.name,
          time: dayjs().format('HH:mm:ss'),
          status: 'scan',
        },
        ...scanHistory,
      ]);
      message.success('扫描成功，进入核对流程');
    } else {
      message.error('未找到对应的处方记录，请检查条码是否正确');
    }
    setScanInput('');
  };

  const handleSimulateScan = () => {
    if (checkingPrescriptions.length > 0) {
      const target = checkingPrescriptions[Math.floor(Math.random() * checkingPrescriptions.length)];
      setScanInput(target.barcode);
      setTimeout(() => handleScan(), 200);
    } else {
      message.warning('当前没有待核对的处方');
    }
  };

  const handleQuickCheckAll = () => {
    setCheckStep(4);
  };

  const handleConfirmPass = () => {
    if (!scannedPrescription) return;
    updatePrescriptionStatus(
      scannedPrescription.id,
      'delivered',
      staff.find((s) => s.id === currentUserId)?.name || '',
      '成品核对通过，安排配送'
    );
    setScanHistory((prev) => [
      {
        id: Date.now(),
        prescriptionNo: scannedPrescription.prescriptionNo,
        patientName: scannedPrescription.patient.name,
        time: dayjs().format('HH:mm:ss'),
        status: 'passed',
      },
      ...prev,
    ]);
    message.success('✅ 核对通过，已标记为待配送');
    setTimeout(() => {
      setScannedPrescription(null);
      setCheckStep(0);
      scanInputRef.current?.focus();
    }, 1500);
  };

  const handleReportError = (p: Prescription) => {
    setCurrentErrorPrescription(p);
    setErrorReportModal(true);
  };

  const handleSubmitError = (values: any) => {
    if (!currentErrorPrescription) return;
    const errorEntry = {
      foundBy: staff.find((s) => s.id === currentUserId)?.name || '',
      errorType: values.errorType,
      description: values.description,
      time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    };
    const updatedErrors = [...(currentErrorPrescription.errorRecord || []), errorEntry];
    useAppStore.setState((state) => ({
      prescriptions: state.prescriptions.map((p) =>
        p.id === currentErrorPrescription.id ? { ...p, errorRecord: updatedErrors } : p
      ),
    }));
    setScanHistory((prev) => [
      {
        id: Date.now(),
        prescriptionNo: currentErrorPrescription.prescriptionNo,
        patientName: currentErrorPrescription.patient.name,
        time: dayjs().format('HH:mm:ss'),
        status: 'error',
        errorType: values.errorType,
      },
      ...prev,
    ]);
    setErrorReportModal(false);
    message.error('⚠️ 差错已登记，已通知调配药师复核');
    setScannedPrescription(null);
    setCheckStep(0);
  };

  const columns = [
    {
      title: '处方号',
      dataIndex: 'prescriptionNo',
      width: 170,
      render: (v: string) => <span style={{ fontFamily: 'monospace' }}>{v}</span>,
    },
    {
      title: '患者信息',
      key: 'patient',
      width: 180,
      render: (_: any, r: Prescription) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.patient.name}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            {r.patient.gender === 'male' ? '男' : '女'}{r.patient.age}岁 · {r.patient.bedNumber}
          </div>
        </div>
      ),
    },
    {
      title: '诊断',
      dataIndex: ['patient', 'diagnosis'],
      key: 'diagnosis',
      ellipsis: true,
    },
    {
      title: '药物项',
      key: 'items',
      width: 200,
      render: (_: any, r: Prescription) => (
        <Space wrap>
          {r.items.map((it, i) => (
            <Tag key={i} color="blue">
              {it.drugName} {it.dosage}
            </Tag>
          ))}
        </Space>
      ),
    },
    { title: '调配工位', dataIndex: 'workstationName', width: 140 },
    { title: '调配药师', dataIndex: 'assignedPharmacistName', width: 90 },
    {
      title: '调配用时',
      key: 'duration',
      width: 100,
      render: (_: any, r: Prescription) => {
        if (r.actualStartTime) {
          const end = r.actualEndTime ? dayjs(r.actualEndTime) : dayjs();
          const mins = end.diff(dayjs(r.actualStartTime), 'minute');
          const exp = r.expectedDuration;
          const over = mins > exp + 5;
          return (
            <Space direction="vertical" size={0}>
              <span style={{ fontWeight: 600, color: over ? '#ff4d4f' : '#52c41a' }}>
                {mins} 分钟
              </span>
              <Progress
                percent={Math.min(100, Math.round((mins / exp) * 100))}
                size="small"
                showInfo={false}
                status={over ? 'exception' : 'normal'}
              />
              <span style={{ fontSize: 10, color: '#8c8c8c' }}>预计 {exp} 分钟</span>
            </Space>
          );
        }
        return <span style={{ color: '#8c8c8c' }}>-</span>;
      },
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 240,
      render: (_: any, r: Prescription) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<ScanOutlined />}
            onClick={() => {
              setScannedPrescription(r);
              setCheckStep(0);
            }}
          >
            开始核对
          </Button>
          <Button
            size="small"
            danger
            icon={<WarningOutlined />}
            onClick={() => handleReportError(r)}
          >
            登记差错
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-card">
        <div className="page-title">
          <Row justify="space-between" align="middle">
            <Col>
              <QrcodeOutlined style={{ marginRight: 8 }} />
              成品核对与贴签管理
            </Col>
            <Col>
              <Space>
                <Tag color="cyan">
                  <ClockCircleOutlined /> 今日已核对: {checkedToday.length}
                </Tag>
                <Tag color="green">
                  <CheckCircleOutlined /> 待核对: {checkingPrescriptions.length}
                </Tag>
                {errorPrescriptions.length > 0 && (
                  <Tag color="red">
                    <WarningOutlined /> 差错: {errorPrescriptions.length}
                  </Tag>
                )}
              </Space>
            </Col>
          </Row>
        </div>

        <Row gutter={16}>
          <Col span={9}>
            <Card
              title={
                <Space>
                  <ScanOutlined style={{ color: '#1677ff' }} />
                  条码扫描核对台
                </Space>
              }
              type="inner"
              style={{ height: '100%' }}
              bodyStyle={{ padding: 24 }}
            >
              <Alert
                type="info"
                showIcon
                message="请将成品输液标签条码对准扫描器，或手动输入处方号/条码"
                style={{ marginBottom: 16 }}
              />

              <Form layout="vertical">
                <Form.Item label="条码/处方号">
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      ref={scanInputRef}
                      size="large"
                      prefix={<ScanOutlined style={{ color: '#1677ff' }} />}
                      placeholder="扫描或输入条码..."
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value)}
                      onPressEnter={handleScan}
                      autoFocus
                    />
                    <Button type="primary" size="large" icon={<ScanOutlined />} onClick={handleScan}>
                      确认扫描
                    </Button>
                  </Space.Compact>
                </Form.Item>
                <Button block icon={<ThunderboltOutlined />} onClick={handleSimulateScan}>
                  模拟扫描（选择待核对处方）
                </Button>
              </Form>

              <Divider />

              {scannedPrescription ? (
                <div>
                  <Alert
                    type="success"
                    showIcon
                    icon={<CheckCircleOutlined />}
                    message="扫描成功 - 请按步骤完成核对"
                    style={{ marginBottom: 16 }}
                  />

                  <Steps
                    current={checkStep}
                    direction="vertical"
                    size="small"
                    style={{ marginBottom: 16 }}
                    items={[
                      {
                        title: '患者信息核对',
                        description: '核对姓名、床号、性别、年龄',
                      },
                      {
                        title: '药品信息核对',
                        description: '核对品名、规格、剂量、数量',
                      },
                      {
                        title: '滴速设置确认',
                        description: '确认输液滴速符合医嘱要求',
                      },
                      {
                        title: '贴签确认',
                        description: '扫描标签条码，打印并粘贴',
                      },
                      {
                        title: '完成核对',
                        description: '确认所有信息无误，放行配送',
                      },
                    ]}
                  />

                  <Card size="small" style={{ marginBottom: 16 }} type="inner">
                    <Descriptions size="small" column={2}>
                      <Descriptions.Item label="患者">
                        <strong>{scannedPrescription.patient.name}</strong>
                      </Descriptions.Item>
                      <Descriptions.Item label="床号">
                        {scannedPrescription.patient.bedNumber}
                      </Descriptions.Item>
                      <Descriptions.Item label="科室">
                        {scannedPrescription.patient.department}
                      </Descriptions.Item>
                      <Descriptions.Item label="处方号">
                        <code>{scannedPrescription.prescriptionNo}</code>
                      </Descriptions.Item>
                    </Descriptions>
                    <Divider style={{ margin: '8px 0' }} />
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>用药清单：</div>
                    {scannedPrescription.items.map((it, i) => (
                      <Tag key={i} style={{ marginBottom: 4 }}>
                        {i + 1}. {it.drugName} {it.dosage}
                      </Tag>
                    ))}
                  </Card>

                  <Row gutter={8}>
                    <Col span={12}>
                      <Button block onClick={() => setCheckStep(Math.max(0, checkStep - 1))} disabled={checkStep === 0}>
                        上一步
                      </Button>
                    </Col>
                    {checkStep < 4 ? (
                      <Col span={12}>
                        <Button type="primary" block onClick={() => setCheckStep(checkStep + 1)}>
                          下一步
                        </Button>
                      </Col>
                    ) : (
                      <Col span={12}>
                        <Button type="primary" block icon={<CheckCircleOutlined />} onClick={handleConfirmPass}>
                          确认通过
                        </Button>
                      </Col>
                    )}
                  </Row>
                  <Button block style={{ marginTop: 8 }} danger icon={<WarningOutlined />} onClick={() => handleReportError(scannedPrescription)}>
                    发现问题，登记差错
                  </Button>
                  <Divider style={{ margin: '12px 0' }} />
                  <Button block icon={<PrinterOutlined />} onClick={handleQuickCheckAll}>
                    快速核对（一键跳过）
                  </Button>
                </div>
              ) : (
                <Empty description="等待扫描..." image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 32 }} />
              )}
            </Card>
          </Col>

          <Col span={15}>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card size="small" style={{ background: 'linear-gradient(135deg, #e6fffb 0%, #87e8de 100%)' }}>
                  <Row align="middle" gutter={12}>
                    <Avatar size={40} style={{ background: '#08979c' }} icon={<QrcodeOutlined />} />
                    <Col flex="auto">
                      <Statistic title="待核对" value={checkingPrescriptions.length} valueStyle={{ fontSize: 22, fontWeight: 700 }} />
                    </Col>
                  </Row>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ background: 'linear-gradient(135deg, #f6ffed 0%, #b7eb8f 100%)' }}>
                  <Row align="middle" gutter={12}>
                    <Avatar size={40} style={{ background: '#389e0d' }} icon={<CheckCircleOutlined />} />
                    <Col flex="auto">
                      <Statistic title="今日完成" value={checkedToday.length} valueStyle={{ fontSize: 22, fontWeight: 700 }} />
                    </Col>
                  </Row>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ background: 'linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%)' }}>
                  <Row align="middle" gutter={12}>
                    <Avatar size={40} style={{ background: '#cf1322' }} icon={<WarningOutlined />} />
                    <Col flex="auto">
                      <Statistic title="累计差错" value={errorPrescriptions.length} valueStyle={{ fontSize: 22, fontWeight: 700 }} />
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>

            <Tabs
              items={[
                {
                  key: 'list',
                  label: (
                    <Space>
                      <FileTextOutlined />
                      待核对列表
                      {checkingPrescriptions.length > 0 && <Badge count={checkingPrescriptions.length} />}
                    </Space>
                  ),
                  children: (
                    <Table
                      dataSource={checkingPrescriptions}
                      columns={columns}
                      rowKey="id"
                      scroll={{ x: 1200 }}
                      pagination={{ showSizeChanger: true, showTotal: (t) => `共 ${t} 条待核对` }}
                      locale={{ emptyText: '🎉 暂无待核对处方，工作已完成！' }}
                    />
                  ),
                },
                {
                  key: 'history',
                  label: (
                    <Space>
                      <ClockCircleOutlined />
                      扫描记录
                    </Space>
                  ),
                  children: (
                    scanHistory.length === 0 ? (
                      <Empty description="暂无扫描记录" style={{ padding: 48 }} />
                    ) : (
                      <Table
                        size="small"
                        dataSource={scanHistory}
                        rowKey="id"
                        pagination={{ pageSize: 10 }}
                        columns={[
                          { title: '时间', dataIndex: 'time', width: 100 },
                          { title: '处方号', dataIndex: 'prescriptionNo', width: 160, render: (v) => <code>{v}</code> },
                          { title: '患者', dataIndex: 'patientName', width: 100 },
                          {
                            title: '状态',
                            dataIndex: 'status',
                            width: 120,
                            render: (v, r) => {
                              const map: Record<string, any> = {
                                scan: { color: 'blue', text: '已扫描' },
                                passed: { color: 'green', text: '核对通过' },
                                error: { color: 'red', text: `差错: ${r.errorType}` },
                              };
                              return <Tag color={map[v].color}>{map[v].text}</Tag>;
                            },
                          },
                        ]}
                      />
                    )
                  ),
                },
                {
                  key: 'errors',
                  label: (
                    <Space>
                      <WarningOutlined />
                      差错记录
                      {errorPrescriptions.length > 0 && <Badge count={errorPrescriptions.length} />}
                    </Space>
                  ),
                  children: (
                    errorPrescriptions.length === 0 ? (
                      <Result status="success" title="太好了！暂无差错记录" subTitle="保持高标准，继续加油" />
                    ) : (
                      <Table
                        size="small"
                        dataSource={errorPrescriptions}
                        rowKey="id"
                        pagination={{ pageSize: 10 }}
                        columns={[
                          { title: '处方号', dataIndex: 'prescriptionNo', width: 160, render: (v) => <code>{v}</code> },
                          { title: '患者', dataIndex: ['patient', 'name'], width: 90 },
                          { title: '药师', dataIndex: 'assignedPharmacistName', width: 80 },
                          {
                            title: '差错详情',
                            key: 'errors',
                            render: (_: any, r: Prescription) => (
                              <Space direction="vertical" size={4}>
                                {r.errorRecord?.map((e, i) => (
                                  <Tag key={i} color="red">
                                    [{e.errorType}] {e.description}
                                  </Tag>
                                ))}
                              </Space>
                            ),
                          },
                          { title: '发现时间', key: 'time', render: (_: any, r: Prescription) => r.errorRecord?.[0]?.time },
                        ]}
                      />
                    )
                  ),
                },
              ]}
            />
          </Col>
        </Row>
      </div>

      <Modal
        title={
          <Space>
            <WarningOutlined style={{ color: '#ff4d4f' }} />
            登记调配差错
          </Space>
        }
        open={errorReportModal}
        onCancel={() => setErrorReportModal(false)}
        onOk={() => form.submit()}
        okText="提交登记"
        okButtonProps={{ danger: true }}
        cancelText="取消"
        width={600}
      >
        <Alert
          type="warning"
          showIcon
          message="请如实填写差错信息，系统将自动记录并统计，用于质量改进分析"
          style={{ marginBottom: 16 }}
        />
        <Form form={form} onFinish={handleSubmitError} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="处方号">
                <Input value={currentErrorPrescription?.prescriptionNo} disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="患者">
                <Input value={currentErrorPrescription?.patient.name} disabled />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="差错类型" name="errorType" rules={[{ required: true, message: '请选择差错类型' }]}>
            <Select placeholder="请选择差错类型">
              <Select.Option value="品种错误">品种错误</Select.Option>
              <Select.Option value="剂量错误">剂量错误</Select.Option>
              <Select.Option value="溶媒错误">溶媒错误</Select.Option>
              <Select.Option value="配伍禁忌">配伍禁忌</Select.Option>
              <Select.Option value="浓度错误">浓度错误</Select.Option>
              <Select.Option value="标签错误">标签贴错</Select.Option>
              <Select.Option value="其他">其他</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="差错描述" name="description" rules={[{ required: true, message: '请详细描述差错情况' }]}>
            <Input.TextArea rows={4} placeholder="请详细描述发现的问题..." />
          </Form.Item>
        </Form>
      </Modal>

      <style>{`.ant-badge-count { margin-left: 4px; }`}</style>
    </div>
  );
};

const Select = (Select as any);

export default ProductCheck;
