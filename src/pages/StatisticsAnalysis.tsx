import React, { useState, useRef } from 'react';
import {
  Row,
  Col,
  Card,
  Button,
  DatePicker,
  Select,
  Space,
  Tabs,
  Statistic,
  Table,
  Tag,
  message,
  Divider,
  Progress,
  Descriptions,
  Avatar,
  Alert,
} from 'antd';
import {
  FilePdfOutlined,
  DownloadOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  TeamOutlined,
  ExperimentOutlined,
  DesktopOutlined,
  CalendarOutlined,
  SafetyOutlined,
  WarningOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useAppStore } from '../store/useAppStore';
import { mockDrugs } from '../mock/data';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const StatisticsAnalysis: React.FC = () => {
  const { prescriptions, workstations, staff, devices, qualityRecords, dispensingRecords } = useAppStore();
  const reportRef = useRef<HTMLDivElement>(null);
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs()]);
  const [selectedZone, setSelectedZone] = useState<string>('all');

  const today = dayjs().format('YYYY-MM-DD');
  const startDate = dateRange[0].format('YYYY-MM-DD');
  const endDate = dateRange[1].format('YYYY-MM-DD');

  const rangePrescriptions = prescriptions.filter((p) => {
    const t = p.scheduleTime.slice(0, 10);
    return t >= startDate && t <= endDate;
  });

  const totalDispensed = rangePrescriptions.filter((p) => ['checking', 'delivered'].includes(p.status)).length;
  const totalErrors = rangePrescriptions.filter((p) => p.errorRecord && p.errorRecord.length > 0).length;
  const errorRate = totalDispensed > 0 ? ((totalErrors / totalDispensed) * 100).toFixed(2) : '0.00';

  const hourData: Record<string, number> = {};
  for (let h = 7; h <= 22; h++) hourData[h] = 0;
  rangePrescriptions.forEach((p) => {
    const h = dayjs(p.scheduleTime).hour();
    if (hourData[h] !== undefined) hourData[h]++;
  });

  const categoryData: Record<string, number> = {
    antibiotic: 0,
    chemotherapy: 0,
    nutrition: 0,
    cardiovascular: 0,
    analgesic: 0,
    other: 0,
  };
  rangePrescriptions.forEach((p) => {
    p.items.forEach((it) => {
      const drug = mockDrugs.find((d) => d.id === it.drugId);
      if (drug) categoryData[drug.category] = (categoryData[drug.category] || 0) + 1;
    });
  });

  const zoneData: Record<string, number> = { antibiotic_zone: 0, chemo_zone: 0, nutrition_zone: 0, general_zone: 0 };
  rangePrescriptions.forEach((p) => {
    zoneData[p.zoneType] = (zoneData[p.zoneType] || 0) + 1;
  });

  const staffStats = staff
    .filter((s) => s.role === 'pharmacist_dispenser' || s.role === 'nurse')
    .map((s) => {
      const count = prescriptions.filter(
        (p) =>
          p.assignedPharmacistId === s.id &&
          ['dispensing', 'checking', 'delivered'].includes(p.status) &&
          p.scheduleTime.slice(0, 10) >= startDate &&
          p.scheduleTime.slice(0, 10) <= endDate
      ).length;
      const hasError = prescriptions.filter(
        (p) =>
          p.assignedPharmacistId === s.id &&
          p.errorRecord &&
          p.errorRecord.length > 0 &&
          p.scheduleTime.slice(0, 10) >= startDate &&
          p.scheduleTime.slice(0, 10) <= endDate
      ).length;
      const errRate = count > 0 ? ((hasError / count) * 100).toFixed(2) : '0.00';
      const effMinutes = count > 0 ? (s.dailyWorkingMinutes / (count || 1)).toFixed(1) : '-';
      return { ...s, count, hasError, errRate, effMinutes };
    })
    .sort((a, b) => b.count - a.count);

  const wsStats = workstations.map((ws) => {
    const cnt = prescriptions.filter(
      (p) =>
        p.workstationId === ws.id &&
        ['dispensing', 'checking', 'delivered'].includes(p.status) &&
        p.scheduleTime.slice(0, 10) >= startDate &&
        p.scheduleTime.slice(0, 10) <= endDate
    ).length;
    const util = Math.round(ws.utilizationRate * 100);
    return { ...ws, cnt, util };
  });

  // 最近7天趋势
  const dailyData: string[] = [];
  const dailyCounts: number[] = [];
  const dailyErrors: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
    dailyData.push(d.slice(5));
    const dayPres = prescriptions.filter((p) => p.scheduleTime.startsWith(d));
    dailyCounts.push(dayPres.length);
    dailyErrors.push(dayPres.filter((p) => p.errorRecord && p.errorRecord.length > 0).length);
  }

  const optionHourly = {
    title: { text: '时段调配量分布', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
    xAxis: { type: 'category', data: Object.keys(hourData).map((h) => `${h}:00`) },
    yAxis: { type: 'value', name: '处方数' },
    series: [
      {
        type: 'bar',
        data: Object.values(hourData),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#1677ff' },
              { offset: 1, color: '#69b1ff' },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
        label: { show: true, position: 'top', fontSize: 10 },
      },
    ],
  };

  const optionCategory = {
    title: { text: '药品分类调配占比', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item', formatter: '{b}: {c}剂 ({d}%)' },
    legend: { orient: 'vertical', left: 'left', top: 'middle' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '72%'],
        center: ['62%', '55%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}\n{d}%' },
        data: [
          { value: categoryData.antibiotic, name: '抗生素类', itemStyle: { color: '#1677ff' } },
          { value: categoryData.chemotherapy, name: '化疗药类', itemStyle: { color: '#eb2f96' } },
          { value: categoryData.nutrition, name: '营养类', itemStyle: { color: '#52c41a' } },
          { value: categoryData.cardiovascular, name: '心血管类', itemStyle: { color: '#fa8c16' } },
          { value: categoryData.analgesic, name: '镇痛类', itemStyle: { color: '#722ed1' } },
          { value: categoryData.other, name: '其他', itemStyle: { color: '#8c8c8c' } },
        ].filter((d) => d.value > 0),
      },
    ],
  };

  const optionTrend = {
    title: { text: '近7日调配量与差错趋势', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    legend: { data: ['调配数量', '差错数量'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '12%', top: '15%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: dailyData },
    yAxis: { type: 'value' },
    series: [
      {
        name: '调配数量',
        type: 'line',
        smooth: true,
        data: dailyCounts,
        areaStyle: { color: 'rgba(22, 119, 255, 0.2)' },
        lineStyle: { width: 3, color: '#1677ff' },
        itemStyle: { color: '#1677ff' },
      },
      {
        name: '差错数量',
        type: 'line',
        smooth: true,
        data: dailyErrors,
        areaStyle: { color: 'rgba(255, 77, 79, 0.2)' },
        lineStyle: { width: 3, color: '#ff4d4f' },
        itemStyle: { color: '#ff4d4f' },
      },
    ],
  };

  const optionStaffRank = {
    title: { text: '调配人员工作量排行', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '10%', bottom: '3%', top: '15%', containLabel: true },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: staffStats.slice(0, 8).map((s) => s.name).reverse() },
    series: [
      {
        type: 'bar',
        data: staffStats.slice(0, 8).map((s) => s.count).reverse(),
        itemStyle: {
          color: (params: any) => {
            const colors = ['#1677ff', '#52c41a', '#faad14', '#13c2c2', '#722ed1', '#eb2f96', '#fa8c16', '#2f54eb'];
            return colors[params.dataIndex % colors.length];
          },
          borderRadius: [0, 4, 4, 0],
        },
        label: { show: true, position: 'right', formatter: '{c} 张' },
      },
    ],
  };

  const optionWsUtil = {
    title: { text: '各工位利用率 (%)', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: wsStats.map((w) => w.name.replace(/^(.{6}).*$/, '$1')),
      axisLabel: { rotate: 30, fontSize: 10 },
    },
    yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
    series: [
      {
        type: 'bar',
        data: wsStats.map((w) => ({
          value: w.util,
          itemStyle: {
            color: w.util > 85 ? '#ff4d4f' : w.util > 70 ? '#faad14' : w.util > 50 ? '#52c41a' : '#1677ff',
          },
        })),
        markLine: {
          silent: true,
          lineStyle: { color: '#ff4d4f' },
          data: [{ yAxis: 85, name: '过载线' }],
        },
        label: { show: true, position: 'top', formatter: '{c}%', fontSize: 10 },
      },
    ],
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    message.loading({ content: '正在生成PDF报告...', key: 'pdf', duration: 0 });
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`PIVAS质量分析报告_${dayjs().format('YYYYMMDD')}.pdf`);
      message.success({ content: 'PDF报告导出成功！', key: 'pdf' });
    } catch (e) {
      message.error({ content: 'PDF导出失败，请重试', key: 'pdf' });
    }
  };

  const staffColumns = [
    { title: '姓名', dataIndex: 'name', width: 90 },
    { title: '角色', key: 'role', width: 80, render: (_: any, r: any) => <Tag color={r.role === 'pharmacist_dispenser' ? 'blue' : 'green'}>{r.role === 'pharmacist_dispenser' ? '药师' : '护士'}</Tag> },
    { title: '调配张数', dataIndex: 'count', width: 90, sorter: (a: any, b: any) => a.count - b.count },
    {
      title: '差错张数',
      key: 'err',
      width: 90,
      render: (_: any, r: any) => <span style={{ color: r.hasError > 0 ? '#ff4d4f' : undefined, fontWeight: 600 }}>{r.hasError}</span>,
    },
    {
      title: '差错率',
      dataIndex: 'errRate',
      width: 90,
      render: (v: string) => (
        <Tag color={parseFloat(v) > 2 ? 'red' : parseFloat(v) > 1 ? 'orange' : 'green'}>
          {v}%
        </Tag>
      ),
    },
    { title: '在岗状态', key: 'duty', width: 80, render: (_: any, r: any) => (r.isOnDuty ? <Tag color="green">在岗</Tag> : <Tag>休假</Tag>) },
    {
      title: '技能分区',
      key: 'skills',
      render: (_: any, r: any) => (
        <Space wrap>
          {r.skills.map((z: string) => (
            <Tag key={z} color="blue">
              {{ antibiotic_zone: '抗生素', chemo_zone: '化疗药', nutrition_zone: '营养', general_zone: '普通' }[z] || z}
            </Tag>
          ))}
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
              <BarChartOutlined style={{ marginRight: 8 }} />
              统计分析与质量报告
            </Col>
            <Col>
              <Space>
                <RangePicker
                  value={dateRange as any}
                  onChange={(v) => v && setDateRange(v as any)}
                  showTime={false}
                />
                <Select value={selectedZone} onChange={setSelectedZone} style={{ width: 140 }}>
                  <Select.Option value="all">全部分区</Select.Option>
                  <Select.Option value="antibiotic_zone">抗生素区</Select.Option>
                  <Select.Option value="chemo_zone">化疗药区</Select.Option>
                  <Select.Option value="nutrition_zone">营养区</Select.Option>
                  <Select.Option value="general_zone">普通区</Select.Option>
                </Select>
                <Button icon={<FilePdfOutlined />} type="primary" onClick={handleExportPDF}>
                  导出月度PDF报告
                </Button>
                <Button icon={<DownloadOutlined />}>导出Excel</Button>
              </Space>
            </Col>
          </Row>
        </div>

        <div ref={reportRef} style={{ padding: 8 }}>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={4}>
              <Card size="small">
                <Statistic
                  title={<span><FileTextOutlined /> 统计周期内总调配</span>}
                  value={rangePrescriptions.length}
                  suffix="张"
                  valueStyle={{ fontSize: 22, color: '#1677ff' }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Statistic
                  title={<span><CheckCircle /> 已完成调配</span>}
                  value={totalDispensed}
                  suffix="张"
                  valueStyle={{ fontSize: 22, color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Statistic
                  title={<span><WarningOutlined /> 差错总数</span>}
                  value={totalErrors}
                  suffix="张"
                  valueStyle={{ fontSize: 22, color: '#ff4d4f' }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Statistic
                  title={<span><SafetyOutlined /> 综合差错率</span>}
                  value={parseFloat(errorRate)}
                  suffix="%"
                  valueStyle={{ fontSize: 22, color: parseFloat(errorRate) > 1 ? '#ff4d4f' : '#52c41a' }}
                  precision={2}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Statistic
                  title={<span><TeamOutlined /> 在岗调配人员</span>}
                  value={staff.filter((s) => s.isOnDuty && (s.role === 'pharmacist_dispenser' || s.role === 'nurse')).length}
                  suffix="人"
                  valueStyle={{ fontSize: 22, color: '#722ed1' }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Statistic
                  title={<span><DesktopOutlined /> 在用工位</span>}
                  value={workstations.filter((w) => w.currentStatus !== 'maintenance').length}
                  suffix={`/${workstations.length}`}
                  valueStyle={{ fontSize: 22, color: '#13c2c2' }}
                />
              </Card>
            </Col>
          </Row>

          <Alert
            type="info"
            showIcon
            icon={<CalendarOutlined />}
            message={`质量分析周期：${startDate} 至 ${endDate}`}
            style={{ marginBottom: 16 }}
          />

          <Tabs
            items={[
              {
                key: 'overview',
                label: <Space><PieChartOutlined />综合概览</Space>,
                children: (
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Card size="small"><ReactECharts option={optionTrend} style={{ height: 320 }} /></Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small"><ReactECharts option={optionHourly} style={{ height: 320 }} /></Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small"><ReactECharts option={optionCategory} style={{ height: 320 }} /></Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small">
                        <div style={{ fontWeight: 600, marginBottom: 12 }}>分区调配分布</div>
                        {[
                          { key: 'antibiotic_zone', label: '抗生素区', color: '#1677ff' },
                          { key: 'chemo_zone', label: '化疗药区', color: '#eb2f96' },
                          { key: 'nutrition_zone', label: '营养区', color: '#52c41a' },
                          { key: 'general_zone', label: '普通区', color: '#faad14' },
                        ].map((z) => (
                          <div key={z.key} style={{ marginBottom: 12 }}>
                            <Row justify="space-between" style={{ marginBottom: 4 }}>
                              <span><Tag color={z.color}>{z.label}</Tag></span>
                              <span style={{ fontWeight: 600 }}>{zoneData[z.key] || 0} 张</span>
                            </Row>
                            <Progress
                              percent={totalDispensed > 0 ? Math.round(((zoneData[z.key] || 0) / totalDispensed) * 100) : 0}
                              showInfo={true}
                              strokeColor={z.color}
                              size="small"
                            />
                          </div>
                        ))}
                      </Card>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'staff',
                label: <Space><TeamOutlined />人员效率分析</Space>,
                children: (
                  <Row gutter={[16, 16]}>
                    <Col span={10}>
                      <Card size="small"><ReactECharts option={optionStaffRank} style={{ height: 380 }} /></Card>
                    </Col>
                    <Col span={14}>
                      <Card size="small" title="调配人员详细绩效">
                        <Table
                          size="small"
                          dataSource={staffStats}
                          columns={staffColumns}
                          rowKey="id"
                          pagination={{ pageSize: 6 }}
                        />
                      </Card>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'workstation',
                label: <Space><DesktopOutlined />设备利用率</Space>,
                children: (
                  <div>
                    <Card size="small" style={{ marginBottom: 16 }}>
                      <ReactECharts option={optionWsUtil} style={{ height: 360 }} />
                    </Card>
                    <Card size="small" title="工位详情数据">
                      <Table
                        size="small"
                        dataSource={wsStats}
                        rowKey="id"
                        pagination={{ pageSize: 8 }}
                        columns={[
                          { title: '工位名称', dataIndex: 'name', width: 150 },
                          {
                            title: '类型',
                            key: 'type',
                            width: 100,
                            render: (_: any, r: any) =>
                              r.type === 'biosafety_cabinet' ? <Tag color="blue">生物安全柜</Tag> : <Tag color="green">层流台</Tag>,
                          },
                          {
                            title: '分区',
                            key: 'zone',
                            width: 100,
                            render: (_: any, r: any) =>
                              ({ antibiotic_zone: '抗生素', chemo_zone: '化疗', nutrition_zone: '营养', general_zone: '普通' } as any)[r.zoneType],
                          },
                          { title: '调配数', dataIndex: 'cnt', width: 80 },
                          {
                            title: '利用率',
                            key: 'util',
                            width: 200,
                            render: (_: any, r: any) => (
                              <Progress
                                percent={r.util}
                                status={r.util > 85 ? 'exception' : r.util > 70 ? 'active' : undefined}
                                strokeColor={r.util > 85 ? '#ff4d4f' : r.util > 70 ? '#faad14' : '#52c41a'}
                              />
                            ),
                          },
                          {
                            title: '压差',
                            key: 'pressure',
                            render: (_: any, r: any) => (
                              <Tag color={r.pressureDifferential >= r.requiredPressureDifferential ? 'green' : 'orange'}>
                                {r.pressureDifferential}Pa / ≥{r.requiredPressureDifferential}Pa
                              </Tag>
                            ),
                          },
                          {
                            title: '状态',
                            key: 'status',
                            width: 80,
                            render: (_: any, r: any) =>
                              ({ idle: <Tag color="green">空闲</Tag>, occupied: <Tag color="blue">占用</Tag>, maintenance: <Tag color="orange">维护</Tag> } as any)[r.currentStatus],
                          },
                        ]}
                      />
                    </Card>
                  </div>
                ),
              },
              {
                key: 'quality',
                label: <Space><LineChartOutlined />质量分析</Space>,
                children: (
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Card size="small" title="差错类型分布">
                        <div style={{ padding: 16 }}>
                          {[
                            { t: '品种错误', c: 1, color: '#ff4d4f' },
                            { t: '剂量错误', c: 0, color: '#faad14' },
                            { t: '溶媒错误', c: 0, color: '#fa8c16' },
                            { t: '配伍禁忌', c: 1, color: '#eb2f96' },
                            { t: '浓度错误', c: 0, color: '#722ed1' },
                            { t: '标签错误', c: 0, color: '#13c2c2' },
                          ].map((item) => (
                            <Row key={item.t} align="middle" style={{ marginBottom: 12 }}>
                              <Col span={5} style={{ color: '#595959' }}>{item.t}</Col>
                              <Col span={14}>
                                <Progress
                                  percent={totalErrors > 0 ? Math.round((item.c / (totalErrors || 1)) * 100) : 0}
                                  strokeColor={item.color}
                                  size="small"
                                  showInfo={false}
                                />
                              </Col>
                              <Col span={5} style={{ textAlign: 'right', fontWeight: 600 }}>
                                {item.c} 起 ({totalErrors > 0 ? Math.round((item.c / totalErrors) * 100) : 0}%)
                              </Col>
                            </Row>
                          ))}
                        </div>
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small" title="质量指标达标情况">
                        <div style={{ padding: 16 }}>
                          {[
                            { name: '处方调配准确率', value: totalDispensed > 0 ? 100 - parseFloat(errorRate) : 100, target: 99.9, unit: '%' },
                            { name: '按时完成率', value: 96.8, target: 95, unit: '%' },
                            { name: '标签正确率', value: 99.6, target: 99.9, unit: '%' },
                            { name: '设备运行正常率', value: workstations.filter((w) => w.currentStatus !== 'maintenance').length / workstations.length * 100, target: 95, unit: '%' },
                            { name: '洁净区压差达标率', value: 90, target: 100, unit: '%' },
                          ].map((q, idx) => (
                            <div key={idx} style={{ marginBottom: 16 }}>
                              <Row justify="space-between" style={{ marginBottom: 4 }}>
                                <span style={{ fontSize: 13 }}>{q.name}</span>
                                <span>
                                  <span style={{ fontSize: 16, fontWeight: 700, color: q.value >= q.target ? '#52c41a' : '#faad14' }}>
                                    {q.value.toFixed(2)}
                                    {q.unit}
                                  </span>
                                  <span style={{ color: '#8c8c8c', marginLeft: 8 }}>
                                    (目标≥{q.target}
                                    {q.unit})
                                  </span>
                                </span>
                              </Row>
                              <Progress
                                percent={Math.min(100, q.value)}
                                success={{ percent: q.target }}
                                strokeColor={q.value >= q.target ? '#52c41a' : '#faad14'}
                              />
                            </div>
                          ))}
                        </div>
                      </Card>
                    </Col>
                  </Row>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
};

const CheckCircle = FileTextOutlined;

export default StatisticsAnalysis;
