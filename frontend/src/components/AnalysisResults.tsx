import React, { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler
} from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import '../styles/AnalysisResults.css';
import { useI18n } from '../i18n';

type Stats = {
  total: number;
  answered: number;
  unanswered: number;
  unclearQuestions: number;
  answerRate: number;
};

type DailyStat = {
  answered: number;
  unanswered: number;
  unclearQuestions: number;
};

type Analysis = {
  total: number;
  answered: number;
  unanswered: number;
  unclearQuestions: number;
  dailyStats: Record<string, DailyStat>;
};

type QAItem = {
  answer?: string | null;
  create_time: string | number | Date;
};

type ApiResponse = {
  code: number;
  message?: string;
  result: {
    items: QAItem[];
    total: number;
  };
};

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler
);

const API_BASE_URL = 'http://10.168.1.105/knowledge/qa_record/search';

const AnalysisResults = () => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<Stats>({
    total: 0,
    answered: 0,
    unanswered: 0,
    unclearQuestions: 0,
    answerRate: 0
  });

  const [ratioData, setRatioData] = useState<ChartData<'doughnut'> | null>(null);
  const [trendData, setTrendData] = useState<ChartData<'line'> | null>(null);

  const processAnalysis = useCallback((items: QAItem[]) => {
    const analysis: Analysis = {
      total: items.length,
      answered: 0,
      unanswered: 0,
      unclearQuestions: 0,
      dailyStats: {}
    };

    items.forEach((item) => {
      const answer = item.answer ? item.answer.trim() : '';

      const isUnclearQuestion =
        answer.includes('您的问题表述不太清晰') ||
        answer.includes('您的问题表述不清晰') ||
        answer.includes('您的问题不清晰') ||
        answer.includes('您的问题描述不够清晰') ||
        answer.includes('您的问题表述不明确') ||
        answer.includes('您的问题不明确') ||
        answer.includes('问题表述不太清晰') ||
        answer.includes('表述不太清晰') ||
        answer.includes('用户的提问不清晰') ||
        answer.includes('用户的这条消息没有提出具体的问题或需要解答的内容') ||
        answer.includes('用户的问题表述不清晰') ||
        answer.includes('没有明确的提问或需求') ||
        answer.includes('过于简略') ||
        answer.includes('用户的问题不清晰') ||
        answer.includes('提问不清晰');

      const isUnanswered =
        !isUnclearQuestion &&
        (
          answer === '' ||
          answer.includes('超出《财务知识库》覆盖范围') ||
          answer.includes('超出知识库覆盖范围') ||
          answer.includes('未查询到') ||
          answer.includes('无法回答') ||
          answer.includes('抱歉') ||
          answer.includes('对不起') ||
          answer.includes('不知道') ||
          answer.length < 10
        );

      if (isUnclearQuestion) {
        analysis.unclearQuestions++;
      } else if (!isUnanswered) {
        analysis.answered++;
      } else {
        analysis.unanswered++;
      }

      const date = new Date(item.create_time).toLocaleDateString('zh-CN');
      if (!analysis.dailyStats[date]) {
        analysis.dailyStats[date] = { answered: 0, unanswered: 0, unclearQuestions: 0 };
      }

      if (isUnclearQuestion) analysis.dailyStats[date].unclearQuestions++;
      else if (!isUnanswered) analysis.dailyStats[date].answered++;
      else analysis.dailyStats[date].unanswered++;
    });

    const answerRate =
      analysis.total > 0 ? Math.round((analysis.answered / analysis.total) * 100) : 0;

    setStats({
      total: analysis.total,
      answered: analysis.answered,
      unanswered: analysis.unanswered,
      unclearQuestions: analysis.unclearQuestions,
      answerRate
    });

    setRatioData({
      labels: [t('analysis.answered'), t('analysis.unanswered'), t('analysis.unclear')],
      datasets: [
        {
          data: [analysis.answered, analysis.unanswered, analysis.unclearQuestions],
          backgroundColor: ['#4CAF50', '#F44336', '#FFC107'],
          borderWidth: 2,
          borderColor: '#fff'
        }
      ]
    });

    const dates = Object.keys(analysis.dailyStats).sort();
    setTrendData({
      labels: dates,
      datasets: [
        {
          label: t('analysis.answered'),
          data: dates.map((date) => analysis.dailyStats[date].answered),
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: t('analysis.unanswered'),
          data: dates.map((date) => analysis.dailyStats[date].unanswered),
          borderColor: '#F44336',
          backgroundColor: 'rgba(244, 67, 54, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: t('analysis.unclear'),
          data: dates.map((date) => analysis.dailyStats[date].unclearQuestions),
          borderColor: '#FFC107',
          backgroundColor: 'rgba(255, 193, 7, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    });
  }, [t]);

  const fetchAndAnalyzeData = useCallback(async () => {
    try {
      setLoading(true);
      const allItems: QAItem[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const apiUrl = `${API_BASE_URL}?page=${page}&page_size=100&client_id=1952665052121272320`;
        const response = await fetch(apiUrl);
        const data: ApiResponse = await response.json();

        if (data.code !== 200) throw new Error(data.message || 'API Error');

        if (data.result.items && data.result.items.length > 0) {
          allItems.push(...data.result.items);
          if (allItems.length >= data.result.total) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      processAnalysis(allItems);
      setLoading(false);
    } catch (err: unknown) {
      console.error('Fetch error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setLoading(false);
    }
  }, [processAnalysis]);

  useEffect(() => {
    void fetchAndAnalyzeData();
  }, [fetchAndAnalyzeData]);

  const lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: 'white' }
      }
    },
    scales: {
      x: {
        ticks: { color: 'rgba(255, 255, 255, 0.7)' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      },
      y: {
        ticks: { color: 'rgba(255, 255, 255, 0.7)' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      }
    }
  };

  const doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: 'white' }
      }
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>{t('analysis.loading')}</div>;
  }

  if (error) {
    return (
      <div style={{ color: 'red', padding: '20px' }}>
        {t('analysis.error', { message: error })}
      </div>
    );
  }

  return (
    <div className="stats-panel">
      <h3>{t('analysis.title')}</h3>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">{t('analysis.totalQuestions')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.answered}</div>
          <div className="stat-label">{t('analysis.answered')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.unanswered}</div>
          <div className="stat-label">{t('analysis.unanswered')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.unclearQuestions}</div>
          <div className="stat-label">{t('analysis.unclear')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.answerRate}%</div>
          <div className="stat-label">{t('analysis.answerRate')}</div>
        </div>
      </div>

      <div className="chart-container">
        <div className="chart-wrapper">
          {ratioData && <Doughnut data={ratioData} options={doughnutOptions} />}
        </div>
        <div className="chart-wrapper">
          {trendData && <Line data={trendData} options={lineChartOptions} />}
        </div>
      </div>
    </div>
  );
};

export default AnalysisResults;
