// js/views/progress.js
import { qs } from '../utils/uiUtils.js';
import * as progressService from '../services/progressService.js';
import { state } from '../main.js'; // <-- ADD this import

function getChaptersFromGlobal() {
  const central = window.CII_W01_TUTOR_DATA?.chapters;
  if (Array.isArray(central) && central.length) return central;
  return [];
}

function activateChart() {
  const ctx = document.getElementById('mastery-chart')?.getContext('2d');
  if (!ctx) return;
  const progress = progressService.getProgress(state.currentUser);
  const allChapters = getChaptersFromGlobal().filter(c => c.id !== 'specimen_exam');
  const labels = allChapters.map(ch => ch.title.replace(/Chapter \d+: /g, ''));
  const data = allChapters.map(ch => {
    const chapterProgress = progress.chapters[ch.id];
    return chapterProgress ? chapterProgress.mastery * 100 : 0;
  });

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Mastery %',
        data: data,
        backgroundColor: 'rgba(251, 191, 36, 0.6)',
        borderColor: 'rgba(251, 191, 36, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
       scales: {
          y: {
              beginAtZero: true,
              grid: { display: false },
              ticks: { color: '#e9ecef', font: { size: 12 } }
          },
          x: {
              max: 100,
              grid: { color: 'rgba(255,255,255,0.1)' },
              ticks: { color: '#9ca3af', font: { size: 12 } }
          }
      },
      plugins: {
          legend: { display: false }
      }
    }
  });
}

export function renderProgress() {
  const wrap = document.createElement('section');
  wrap.className = 'screen screen-progress';
  const progress = progressService.getProgress(state.currentUser);
  const { strengths, weaknesses } = progressService.analyzePerformance(state.currentUser);
  const allChaptersData = getChaptersFromGlobal();

  const chapterTitleMap = allChaptersData.reduce((acc, ch) => {
    acc[ch.id] = ch.title.replace(/Chapter \d+: /g, '');
    return acc;
  }, {});

  const chapterMasteries = Object.values(progress.chapters).map(ch => ch.mastery);
  const overallMastery = chapterMasteries.length > 0 ?
    (chapterMasteries.reduce((a, b) => a + b, 0) / chapterMasteries.length) * 100 :
    0;

  const streak = progress.studyStreak || { current: 0, longest: 0 };

  const renderPerfList = (items, type) => {
    if (items.length === 0) {
        return `<p class="text-neutral-500 text-sm">Not enough quiz data to determine your ${type}. Complete some more quizzes!</p>`;
    }
    const isWeakness = type === 'weaknesses';
    return `<ul class="space-y-2">` + items.map(item => `
        <li class="${isWeakness ? 'actionable-weakness' : ''} flex justify-between items-center text-sm p-2 rounded-lg ${isWeakness ? 'cursor-pointer hover:bg-white/10' : ''}" ${isWeakness ? `data-chapter-id="${item.chapterId}"` : ''}>
            <span class="text-neutral-300">${chapterTitleMap[item.chapterId] || item.chapterId}</span>
            <span class="font-semibold ${type === 'strengths' ? 'text-green-400' : 'text-red-400'}">${Math.round(item.percentage)}% ${isWeakness ? '➔' : ''}</span>
        </li>
    `).join('') + `</ul>`;
  };

  wrap.innerHTML = `
    <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-white">My Progress</h1>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-1 grid grid-cols-2 lg:grid-cols-1 gap-6">
            <div class="card text-center bg-white/5 border border-white/10">
                <h2 class="text-lg font-semibold text-neutral-300">Mastery</h2>
                <p class="text-6xl font-bold text-amber-400 my-2">${Math.round(overallMastery)}%</p>
                <p class="text-xs text-neutral-400">Based on Flashcards</p>
            </div>
            <div class="card text-center bg-white/5 border border-white/10">
                <h2 class="text-lg font-semibold text-neutral-300">Study Streak</h2>
                <p class="text-6xl font-bold text-amber-400 my-2">${streak.current} ${streak.current === 1 ? 'day' : 'days'}</p>
                <p class="text-xs text-neutral-400">Longest: ${streak.longest}</p>
            </div>
            <div class="col-span-2 lg:col-span-1 card bg-white/5 border border-white/10">
                <h3 class="text-lg font-semibold text-neutral-300 mb-3">Strengths</h3>
                ${renderPerfList(strengths, 'strengths')}
            </div>
             <div class="col-span-2 lg:col-span-1 card bg-white/5 border border-white/10">
                <h3 class="text-lg font-semibold text-neutral-300 mb-3">Chapters to Review</h3>
                ${renderPerfList(weaknesses, 'weaknesses')}
            </div>
        </div>
        <div class="lg:col-span-2 card bg-white/5 border border-white/10">
            <h2 class="text-lg font-semibold text-neutral-300 mb-4">Mastery by Chapter</h2>
            <div class="min-h-[300px]"><canvas id="mastery-chart"></canvas></div>
        </div>
        <div class="lg:col-span-3 card bg-white/5 border border-white/10">
            <h2 class="text-lg font-semibold text-neutral-300 mb-4">Recent Activity</h2>
            <div id="activity-log" class="space-y-3"></div>
             <button id="open-reset-modal" class="btn bg-red-600 hover:bg-red-700 mt-6">Reset All Progress</button>
        </div>
    </div>
  `;

  const activityLog = qs('#activity-log', wrap);
  if (progress.recentActivity.length > 0) {
    progress.recentActivity.forEach(act => {
      const actEl = document.createElement('div');
      actEl.className = 'text-neutral-300 text-sm flex justify-between items-center';
      const activityText = act.type === 'quiz' ? `Completed Quiz: ${act.chapter}` : `Studied Flashcards: ${act.chapter}`;
      const scoreText = act.score ? `Score: ${act.score}` : '';
      actEl.innerHTML = `
          <p>${activityText}</p>
          <div class="text-right">
              <p>${scoreText}</p>
              <p class="text-neutral-500 text-xs">${new Date(act.date).toLocaleDateString()}</p>
          </div>
      `;
      activityLog.appendChild(actEl);
    });
  } else {
    activityLog.innerHTML = `<p class="text-neutral-500">No activity yet. Take a quiz or study some flashcards to see your progress!</p>`;
  }

  // Activate chart after rendering
  setTimeout(activateChart, 0);

  return wrap;
}