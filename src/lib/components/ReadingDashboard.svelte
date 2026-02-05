<script lang="ts">
  import { onMount } from 'svelte';
  import { readingStatsService } from '../services/reading-stats';
  import { bookStore } from '../stores/book.svelte';
  import { Clock, BookOpen, TrendingUp, Calendar, Target, Zap, Info, Award, BarChart3 } from 'lucide-svelte';
  import Tooltip from './ui/Tooltip.svelte';

  interface Props {
    onModalOpen?: (filter: 'all' | 'today' | 'week' | string) => void;
  }

  let { onModalOpen }: Props = $props();

  let stats = $state<any>(null);
  let todayTime = $state(0);
  let weekTime = $state(0);
  let weeklyProgress = $state<any[]>([]);
  let bookMetrics = $state<any>(null);

  onMount(() => {
    loadStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  });

  function loadStats() {
    stats = readingStatsService.getStats();
    todayTime = readingStatsService.getTodayReadingTime();
    weekTime = readingStatsService.getWeekReadingTime();
    weeklyProgress = readingStatsService.getWeeklyProgress(12); // Last 12 weeks

    // Calculate book metrics for active book
    const activeSession = bookStore.activeSession;
    if (activeSession && stats) {
      const book = bookStore.availableBooks.find(b => b.id === activeSession.bookId);
      if (book) {
        const progress = bookStore.overallBookProgress;
        bookMetrics = readingStatsService.calculateBookMetrics(
          book.id,
          book.totalWords,
          activeSession.chapters.length || Object.keys(book.chapterProgress).length,
          progress
        );
        // Add last read date
        if (book.lastRead) {
          bookMetrics.lastRead = book.lastRead;
        }
      }
    }
  }

  function formatDuration(ms: number): string {
    return readingStatsService.formatDuration(ms);
  }

  function formatDurationDetailed(ms: number): string {
    return readingStatsService.formatDurationDetailed(ms);
  }

  function formatNumber(num: number): string {
    return num.toLocaleString('pt-BR');
  }

  function formatDateTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  function getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case 'easy': return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'hard': return 'text-red-400 bg-red-400/10 border-red-400/30';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  }

  function getDifficultyText(difficulty: string): string {
    switch (difficulty) {
      case 'easy': return 'Fácil';
      case 'medium': return 'Médio';
      case 'hard': return 'Difícil';
      default: return 'Desconhecido';
    }
  }

  function getMaxWeeklyTime(): number {
    if (weeklyProgress.length === 0) return 1;
    return Math.max(...weeklyProgress.map(w => w.time), 1);
  }

  function getWPMDescription(wpm: number): string {
    if (wpm < 150) return 'Leitura mais lenta, ideal para textos técnicos ou complexos';
    if (wpm < 200) return 'Velocidade média, boa para leitura geral';
    if (wpm < 250) return 'Leitura rápida, eficiente para textos simples';
    return 'Leitura muito rápida, excelente para textos leves';
  }

  function openSessionsModal(filter: 'all' | 'today' | 'week' | string) {
    onModalOpen?.(filter);
  }
</script>

<div class="h-full w-full relative">
  <div class="h-full overflow-y-auto editor-scroll-container">
    <div class="p-6 bg-cursor-bg text-cursor-text">
      <div class="max-w-7xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <BarChart3 size={28} class="text-blue-400" />
          Dashboard de Leitura
        </h1>
        <button
          class="text-xs text-cursor-comment hover:text-cursor-text px-3 py-1 rounded border border-cursor-border hover:border-cursor-selection transition-colors"
          onclick={loadStats}
        >
          Atualizar
        </button>
      </div>

    {#if stats}
      <!-- Estatísticas Gerais - Cards Principais -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <!-- Tempo Total -->
        <div 
          class="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-lg p-5 hover:border-blue-500/50 transition-all group cursor-pointer"
          onclick={(e) => {
            e.stopPropagation();
            openSessionsModal('all');
          }}
          role="button"
          tabindex="0"
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openSessionsModal('all');
            }
          }}
        >
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="p-2 bg-blue-500/20 rounded-lg">
                <Clock size={20} class="text-blue-400" />
              </div>
              <span class="text-sm font-medium text-cursor-comment">Tempo Total</span>
            </div>
            <span onclick={(e) => e.stopPropagation()} role="presentation">
              <Tooltip text="Soma de todo o tempo de leitura registrado desde o início. Calculado somando todas as sessões de leitura completadas.">
                <Info size={14} class="text-cursor-comment opacity-0 group-hover:opacity-100 transition-opacity cursor-help" />
              </Tooltip>
            </span>
          </div>
          <div class="text-3xl font-bold text-blue-400 mb-1">{formatDuration(stats.totalTime)}</div>
          <div class="text-xs text-cursor-comment">
            {stats.sessionsCount} sessões registradas
          </div>
          {#if stats.lastReadDate}
            <div class="text-xs text-blue-400/70 mt-1">
              Última leitura: {formatDate(new Date(stats.lastReadDate).getTime())}
            </div>
          {/if}
        </div>

        <!-- Palavras Lidas -->
        <div class="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 rounded-lg p-5 hover:border-green-500/50 transition-all group">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="p-2 bg-green-500/20 rounded-lg">
                <Target size={20} class="text-green-400" />
              </div>
              <span class="text-sm font-medium text-cursor-comment">Palavras Lidas</span>
            </div>
            <Tooltip text="Total de palavras lidas em todas as sessões. Baseado na contagem de palavras dos capítulos lidos durante as sessões ativas.">
              <Info size={14} class="text-cursor-comment opacity-0 group-hover:opacity-100 transition-opacity cursor-help" />
            </Tooltip>
          </div>
          <div class="text-3xl font-bold text-green-400 mb-1">{formatNumber(stats.totalWords)}</div>
          <div class="text-xs text-cursor-comment">
            ~{Math.round(stats.totalWords / 250)} páginas
          </div>
        </div>

        <!-- PPM Médio -->
        <div class="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30 rounded-lg p-5 hover:border-purple-500/50 transition-all group">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="p-2 bg-purple-500/20 rounded-lg">
                <Zap size={20} class="text-purple-400" />
              </div>
              <span class="text-sm font-medium text-cursor-comment">PPM Médio</span>
            </div>
            <Tooltip text="Palavras Por Minuto - Velocidade média de leitura calculada dividindo o total de palavras pelo total de tempo em minutos. Fórmula: (Total de Palavras × 60) / Tempo Total (ms)">
              <Info size={14} class="text-cursor-comment opacity-0 group-hover:opacity-100 transition-opacity cursor-help" />
            </Tooltip>
          </div>
          <div class="text-3xl font-bold text-purple-400 mb-1">{stats.averageWPM} PPM</div>
          <div class="text-xs text-cursor-comment">
            {getWPMDescription(stats.averageWPM)}
          </div>
        </div>

        <!-- Sequência -->
        <div class="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/30 rounded-lg p-5 hover:border-orange-500/50 transition-all group">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="p-2 bg-orange-500/20 rounded-lg">
                <Award size={20} class="text-orange-400" />
              </div>
              <span class="text-sm font-medium text-cursor-comment">Sequência</span>
            </div>
            <Tooltip text="Dias consecutivos de leitura. Conta apenas dias em que você iniciou pelo menos uma sessão de leitura. A sequência é resetada se você não ler por mais de 1 dia.">
              <Info size={14} class="text-cursor-comment opacity-0 group-hover:opacity-100 transition-opacity cursor-help" />
            </Tooltip>
          </div>
          <div class="text-3xl font-bold text-orange-400 mb-1">{stats.streakDays} dias</div>
          <div class="text-xs text-cursor-comment">
            {#if stats.streakDays > 0}
              Continue assim! 🔥
            {:else}
              Comece uma sequência hoje
            {/if}
          </div>
        </div>
      </div>

      <!-- Estatísticas Diárias/Semanais -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div 
          class="bg-cursor-sidebar/50 border border-cursor-border rounded-lg p-6 hover:border-blue-500/50 transition-all group cursor-pointer"
          onclick={(e) => {
            e.stopPropagation();
            openSessionsModal('today');
          }}
          role="button"
          tabindex="0"
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openSessionsModal('today');
            }
          }}
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold flex items-center gap-2">
              <Clock size={18} class="text-blue-400" />
              Hoje
            </h3>
            <Tooltip text="Tempo total de leitura registrado hoje. Calculado somando todas as sessões iniciadas no dia atual (00:00 até agora).">
              <Info size={14} class="text-cursor-comment opacity-0 group-hover:opacity-100 transition-opacity cursor-help" />
            </Tooltip>
          </div>
          <div class="text-4xl font-bold text-blue-400 mb-2">{formatDuration(todayTime)}</div>
          <div class="text-sm text-cursor-comment mb-1">
            {#if todayTime === 0}
              Nenhuma leitura registrada hoje
            {:else}
              {formatDurationDetailed(todayTime)} de leitura
            {/if}
          </div>
          <div class="text-xs text-blue-400/70">
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            })}
          </div>
          {#if todayTime > 0}
            <div class="mt-4 pt-4 border-t border-cursor-border">
              <div class="text-xs text-cursor-comment">
                Meta diária sugerida: 30 minutos
              </div>
              <div class="w-full bg-cursor-bg rounded-full h-2 mt-2">
                <div
                  class="bg-blue-400 h-2 rounded-full transition-all"
                  style="width: {Math.min((todayTime / (30 * 60 * 1000)) * 100, 100)}%"
                ></div>
              </div>
            </div>
          {/if}
        </div>

        <div 
          class="bg-cursor-sidebar/50 border border-cursor-border rounded-lg p-6 hover:border-green-500/50 transition-all group cursor-pointer"
          onclick={(e) => {
            e.stopPropagation();
            openSessionsModal('week');
          }}
          role="button"
          tabindex="0"
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openSessionsModal('week');
            }
          }}
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold flex items-center gap-2">
              <Calendar size={18} class="text-green-400" />
              Esta Semana
            </h3>
            <Tooltip text="Tempo total de leitura desde o início da semana atual (domingo). Calculado somando todas as sessões da semana.">
              <Info size={14} class="text-cursor-comment opacity-0 group-hover:opacity-100 transition-opacity cursor-help" />
            </Tooltip>
          </div>
          <div class="text-4xl font-bold text-green-400 mb-2">{formatDuration(weekTime)}</div>
          <div class="text-sm text-cursor-comment mb-1">
            {#if weekTime === 0}
              Nenhuma leitura esta semana
            {:else}
              {formatDurationDetailed(weekTime)} esta semana
            {/if}
          </div>
          {#if true}
            {@const now = new Date()}
            {@const dayOfWeek = now.getDay()}
            {@const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek)}
            {@const weekEnd = new Date(weekStart)}
            {@const weekEndDate = weekEnd.setDate(weekEnd.getDate() + 6)}
            <div class="text-xs text-green-400/70">
              {formatDate(weekStart.getTime())} - {formatDate(weekEndDate)}
            </div>
          {/if}
          {#if weekTime > 0}
            <div class="mt-4 pt-4 border-t border-cursor-border">
              <div class="text-xs text-cursor-comment">
                Meta semanal sugerida: 3 horas
              </div>
              <div class="w-full bg-cursor-bg rounded-full h-2 mt-2">
                <div
                  class="bg-green-400 h-2 rounded-full transition-all"
                  style="width: {Math.min((weekTime / (3 * 60 * 60 * 1000)) * 100, 100)}%"
                ></div>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Progresso Semanal com Gráfico -->
      {#if weeklyProgress.length > 0}
        <div class="bg-cursor-sidebar/50 border border-cursor-border rounded-lg p-6 mb-8 group">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold flex items-center gap-2">
              <TrendingUp size={18} class="text-purple-400" />
              Progresso Semanal (Últimas 12 Semanas)
            </h3>
            <Tooltip text="Visualização do tempo de leitura por semana. Cada barra representa uma semana, mostrando o tempo total e palavras lidas. Útil para identificar padrões e tendências de leitura.">
              <Info size={14} class="text-cursor-comment opacity-0 group-hover:opacity-100 transition-opacity cursor-help" />
            </Tooltip>
          </div>
          
          <div class="space-y-3">
            {#each weeklyProgress.slice().reverse() as week}
              {@const maxTime = getMaxWeeklyTime()}
              {@const weekMatch = week.week.match(/(\d{4})-W(\d{2})/)}
              <div 
                class="group/item cursor-pointer hover:bg-cursor-bg/30 rounded p-2 -m-2 transition-colors"
                onclick={(e) => {
                  e.stopPropagation();
                  openSessionsModal(week.week);
                }}
                role="button"
                tabindex="0"
                onkeydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openSessionsModal(week.week);
                  }
                }}
              >
                <div class="flex items-center justify-between mb-1">
                  <div class="flex flex-col">
                    <span class="text-sm font-medium text-cursor-text">{week.week}</span>
                    {#if weekMatch}
                      {@const year = parseInt(weekMatch[1])}
                      {@const weekNum = parseInt(weekMatch[2])}
                      {@const weekStartDate = new Date(year, 0, 1 + (weekNum - 1) * 7)}
                      {@const weekStartDay = weekStartDate.getDay()}
                      {@const weekStart = new Date(weekStartDate.setDate(weekStartDate.getDate() - weekStartDay))}
                      {@const weekEnd = new Date(weekStart)}
                      {@const weekEndDate = weekEnd.setDate(weekEnd.getDate() + 6)}
                      <span class="text-xs text-cursor-comment">{formatDate(weekStart.getTime())} - {formatDate(weekEndDate)}</span>
                    {/if}
                  </div>
                  <div class="flex flex-col items-end gap-1">
                    <div class="flex items-center gap-4 text-xs">
                      <span class="text-cursor-comment">{formatDuration(week.time * 60 * 1000)}</span>
                      <span class="text-cursor-comment">{formatNumber(week.words)} palavras</span>
                    </div>
                    <span class="text-xs text-cursor-comment">{formatDurationDetailed(week.time * 60 * 1000)}</span>
                  </div>
                </div>
                <div class="w-full bg-cursor-bg rounded-full h-3 overflow-hidden">
                  <div
                    class="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all group-hover/item:opacity-80"
                    style="width: {maxTime > 0 ? (week.time / maxTime) * 100 : 0}%"
                  ></div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Métricas do Livro Atual -->
      {#if bookMetrics}
        <div class="bg-cursor-sidebar/50 border border-cursor-border rounded-lg p-6 group">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold flex items-center gap-2">
              <BookOpen size={18} class="text-yellow-400" />
              Métricas do Livro Atual
            </h3>
            <Tooltip text="Estatísticas específicas do livro que você está lendo atualmente. Baseadas no seu histórico de leitura deste livro e nas características do texto.">
              <Info size={14} class="text-cursor-comment opacity-0 group-hover:opacity-100 transition-opacity cursor-help" />
            </Tooltip>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Tempo Estimado -->
            <div class="bg-cursor-bg/50 border border-cursor-border rounded-lg p-4 hover:border-blue-500/50 transition-all group/item">
              <div class="flex items-center justify-between mb-2">
                <div class="text-sm font-medium text-cursor-comment">Tempo Estimado</div>
                <Tooltip text="Tempo estimado para terminar o livro baseado no seu PPM médio e palavras restantes. Fórmula: (Palavras Restantes × 60) / Seu PPM Médio">
                  <Info size={12} class="text-cursor-comment opacity-0 group-hover/item:opacity-100 transition-opacity cursor-help" />
                </Tooltip>
              </div>
              <div class="text-xl font-bold text-blue-400">{formatDuration(bookMetrics.estimatedTime)}</div>
              <div class="text-xs text-cursor-comment mt-1">
                {formatDurationDetailed(bookMetrics.estimatedTime)}
              </div>
              <div class="text-xs text-blue-400/70 mt-1">
                Baseado no seu PPM médio
              </div>
            </div>

            <!-- Dificuldade -->
            <div class="bg-cursor-bg/50 border border-cursor-border rounded-lg p-4 hover:border-yellow-500/50 transition-all group/item">
              <div class="flex items-center justify-between mb-2">
                <div class="text-sm font-medium text-cursor-comment">Dificuldade</div>
                <Tooltip text="Classificação baseada em palavras por capítulo e sua velocidade de leitura. Fácil: PPM alto ou capítulos curtos. Médio: valores intermediários. Difícil: PPM baixo ou capítulos muito longos.">
                  <Info size={12} class="text-cursor-comment opacity-0 group-hover/item:opacity-100 transition-opacity cursor-help" />
                </Tooltip>
              </div>
              <div class="text-xl font-bold {getDifficultyColor(bookMetrics.difficulty)} px-3 py-1 rounded border inline-block">
                {getDifficultyText(bookMetrics.difficulty)}
              </div>
            </div>

            <!-- Seu PPM -->
            <div class="bg-cursor-bg/50 border border-cursor-border rounded-lg p-4 hover:border-purple-500/50 transition-all group/item">
              <div class="flex items-center justify-between mb-2">
                <div class="text-sm font-medium text-cursor-comment">Seu PPM</div>
                <Tooltip text="Sua velocidade média de leitura específica para este livro. Calculado dividindo palavras lidas pelo tempo gasto neste livro.">
                  <Info size={12} class="text-cursor-comment opacity-0 group-hover/item:opacity-100 transition-opacity cursor-help" />
                </Tooltip>
              </div>
              <div class="text-xl font-bold text-purple-400">{bookMetrics.averageWPM} PPM</div>
              <div class="text-xs text-cursor-comment mt-1">
                {getWPMDescription(bookMetrics.averageWPM)}
              </div>
            </div>

            <!-- Palavras Totais -->
            <div class="bg-cursor-bg/50 border border-cursor-border rounded-lg p-4 hover:border-green-500/50 transition-all group/item">
              <div class="flex items-center justify-between mb-2">
                <div class="text-sm font-medium text-cursor-comment">Palavras Totais</div>
                <Tooltip text="Número total de palavras no livro completo, contadas automaticamente ao carregar o EPUB.">
                  <Info size={12} class="text-cursor-comment opacity-0 group-hover/item:opacity-100 transition-opacity cursor-help" />
                </Tooltip>
              </div>
              <div class="text-xl font-bold text-green-400">{formatNumber(bookMetrics.totalWords)}</div>
              <div class="text-xs text-cursor-comment mt-1">
                ~{Math.round(bookMetrics.totalWords / 250)} páginas
              </div>
            </div>

            <!-- Capítulos -->
            <div class="bg-cursor-bg/50 border border-cursor-border rounded-lg p-4 hover:border-cyan-500/50 transition-all group/item">
              <div class="flex items-center justify-between mb-2">
                <div class="text-sm font-medium text-cursor-comment">Capítulos</div>
                <Tooltip text="Número total de capítulos no livro.">
                  <Info size={12} class="text-cursor-comment opacity-0 group-hover/item:opacity-100 transition-opacity cursor-help" />
                </Tooltip>
              </div>
              <div class="text-xl font-bold text-cyan-400">{bookMetrics.chaptersCount}</div>
            </div>

            <!-- Progresso -->
            <div class="bg-cursor-bg/50 border border-cursor-border rounded-lg p-4 hover:border-green-500/50 transition-all group/item">
              <div class="flex items-center justify-between mb-2">
                <div class="text-sm font-medium text-cursor-comment">Progresso</div>
                <Tooltip text="Porcentagem do livro já lida. Calculado baseado nos capítulos completados e no progresso do capítulo atual.">
                  <Info size={12} class="text-cursor-comment opacity-0 group-hover/item:opacity-100 transition-opacity cursor-help" />
                </Tooltip>
              </div>
              <div class="text-xl font-bold text-green-400">{bookMetrics.progress}%</div>
              <div class="w-full bg-cursor-bg rounded-full h-2 mt-2">
                <div
                  class="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all"
                  style="width: {bookMetrics.progress}%"
                ></div>
              </div>
            </div>
          </div>
          
          {#if bookMetrics.lastRead}
            <div class="mt-4 pt-4 border-t border-cursor-border">
              <div class="text-xs text-cursor-comment mb-1">Última Leitura</div>
              <div class="text-sm font-medium text-yellow-400">
                {formatDateTime(bookMetrics.lastRead)}
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <div class="bg-cursor-sidebar/50 border border-cursor-border rounded-lg p-6 text-center">
          <BookOpen size={48} class="text-cursor-comment mx-auto mb-4 opacity-50" />
          <p class="text-cursor-comment">Nenhum livro aberto no momento</p>
          <p class="text-sm text-cursor-comment mt-2">Abra um livro para ver métricas detalhadas</p>
        </div>
      {/if}
    {:else}
      <div class="text-center py-16">
        <BarChart3 size={64} class="text-cursor-comment mx-auto mb-4 opacity-50" />
        <p class="text-cursor-comment text-lg mb-2">Nenhuma estatística disponível</p>
        <p class="text-sm text-cursor-comment">Comece a ler para gerar estatísticas!</p>
      </div>
    {/if}
      </div>
    </div>
  </div>
</div>