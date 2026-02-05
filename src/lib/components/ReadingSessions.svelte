<script lang="ts">
  import { onMount } from 'svelte';
  import { readingStatsService, type ReadingSession } from '../services/reading-stats';
  import { bookStore } from '../stores/book.svelte';
  import { Clock, BookOpen, Calendar, Filter } from 'lucide-svelte';

  interface Props {
    filter?: 'all' | 'today' | 'week' | string;
  }

  let { filter = 'all' }: Props = $props();

  let sessions = $state<ReadingSession[]>([]);
  let filteredSessions = $state<ReadingSession[]>([]);
  let currentFilter = $state<'all' | 'today' | 'week' | string>(filter);

  onMount(() => {
    loadSessions();
  });

  $effect(() => {
    currentFilter = filter;
    applyFilter();
  });

  function loadSessions() {
    sessions = readingStatsService.getSessions();
    applyFilter();
  }

  function applyFilter() {
    if (currentFilter === 'all') {
      filteredSessions = [...sessions].reverse(); // Most recent first
    } else if (currentFilter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      filteredSessions = sessions
        .filter(s => s.date === today)
        .reverse();
    } else if (currentFilter === 'week') {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      filteredSessions = sessions
        .filter(s => {
          const sessionDate = new Date(s.date);
          return sessionDate >= weekStart && sessionDate <= weekEnd;
        })
        .reverse();
    } else {
      // Filter by specific week (format: '2024-W50')
      const weekMatch = currentFilter.match(/(\d{4})-W(\d{2})/);
      if (weekMatch) {
        const year = parseInt(weekMatch[1]);
        const weekNum = parseInt(weekMatch[2]);
        const weekStartDate = new Date(year, 0, 1 + (weekNum - 1) * 7);
        const weekStartDay = weekStartDate.getDay();
        const weekStart = new Date(weekStartDate);
        weekStart.setDate(weekStart.getDate() - weekStartDay);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        filteredSessions = sessions
          .filter(s => {
            const sessionDate = new Date(s.date);
            return sessionDate >= weekStart && sessionDate <= weekEnd;
          })
          .reverse();
      } else {
        filteredSessions = [];
      }
    }
  }

  function formatDuration(ms: number): string {
    return readingStatsService.formatDuration(ms);
  }

  function formatDurationDetailed(ms: number): string {
    return readingStatsService.formatDurationDetailed(ms);
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

  function getBookTitle(bookId: string): string {
    const book = bookStore.availableBooks.find(b => b.id === bookId);
    return book?.title || 'Livro desconhecido';
  }

  function getFilterTitle(): string {
    if (currentFilter === 'all') return 'Todas as Sessões';
    if (currentFilter === 'today') return 'Sessões de Hoje';
    if (currentFilter === 'week') return 'Sessões desta Semana';
    const weekMatch = currentFilter.match(/(\d{4})-W(\d{2})/);
    if (weekMatch) {
      const year = parseInt(weekMatch[1]);
      const weekNum = parseInt(weekMatch[2]);
      const weekStartDate = new Date(year, 0, 1 + (weekNum - 1) * 7);
      const weekStartDay = weekStartDate.getDay();
      const weekStart = new Date(weekStartDate);
      weekStart.setDate(weekStart.getDate() - weekStartDay);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      return `Sessões da Semana ${weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - ${weekEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    }
    return 'Sessões';
  }

  function setFilter(newFilter: 'all' | 'today' | 'week' | string) {
    currentFilter = newFilter;
    applyFilter();
  }
</script>

<div class="h-full overflow-y-auto editor-scroll-container">
  <div class="p-6 bg-cursor-bg text-cursor-text">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold flex items-center gap-2 mb-2">
            <Clock size={28} class="text-blue-400" />
            {getFilterTitle()}
          </h1>
          <p class="text-sm text-cursor-comment">
            {filteredSessions.length} {filteredSessions.length === 1 ? 'sessão encontrada' : 'sessões encontradas'}
          </p>
        </div>
        <button
          class="text-xs text-cursor-comment hover:text-cursor-text px-3 py-1 rounded border border-cursor-border hover:border-cursor-selection transition-colors"
          onclick={loadSessions}
        >
          Atualizar
        </button>
      </div>

      <!-- Filter Buttons -->
      <div class="flex items-center gap-2 mb-6 pb-4 border-b border-cursor-border">
        <Filter size={16} class="text-cursor-comment" />
        <span class="text-sm text-cursor-comment mr-2">Filtrar:</span>
        <button
          class="px-4 py-2 rounded text-sm transition-colors {currentFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-cursor-bg/50 text-cursor-text hover:bg-cursor-bg border border-cursor-border'}"
          onclick={() => setFilter('all')}
        >
          Todas
        </button>
        <button
          class="px-4 py-2 rounded text-sm transition-colors {currentFilter === 'today' ? 'bg-blue-500 text-white' : 'bg-cursor-bg/50 text-cursor-text hover:bg-cursor-bg border border-cursor-border'}"
          onclick={() => setFilter('today')}
        >
          Hoje
        </button>
        <button
          class="px-4 py-2 rounded text-sm transition-colors {currentFilter === 'week' ? 'bg-blue-500 text-white' : 'bg-cursor-bg/50 text-cursor-text hover:bg-cursor-bg border border-cursor-border'}"
          onclick={() => setFilter('week')}
        >
          Esta Semana
        </button>
      </div>

      <!-- Sessions List -->
      {#if filteredSessions.length === 0}
        <div class="text-center py-16">
          <Calendar size={64} class="text-cursor-comment mx-auto mb-4 opacity-50" />
          <p class="text-cursor-comment text-lg mb-2">Nenhuma sessão encontrada</p>
          <p class="text-sm text-cursor-comment">Comece a ler para registrar sessões!</p>
        </div>
      {:else}
        <div class="space-y-3">
          {#each filteredSessions as session}
            {@const bookTitle = getBookTitle(session.bookId)}
            <div class="bg-cursor-sidebar/50 border border-cursor-border rounded-lg p-4 hover:border-blue-500/50 transition-all">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-3">
                    <BookOpen size={18} class="text-blue-400 flex-shrink-0" />
                    <h3 class="font-semibold text-cursor-text truncate">{bookTitle}</h3>
                  </div>
                  
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div class="text-cursor-comment text-xs mb-1">Início</div>
                      <div class="text-cursor-text font-mono text-xs">{formatDateTime(session.startTime)}</div>
                    </div>
                    {#if session.endTime}
                      <div>
                        <div class="text-cursor-comment text-xs mb-1">Fim</div>
                        <div class="text-cursor-text font-mono text-xs">{formatDateTime(session.endTime)}</div>
                      </div>
                    {/if}
                    <div>
                      <div class="text-cursor-comment text-xs mb-1">Duração</div>
                      <div class="text-green-400 font-mono font-semibold">
                        {formatDuration(session.duration)}
                      </div>
                      <div class="text-xs text-cursor-comment mt-0.5">
                        {formatDurationDetailed(session.duration)}
                      </div>
                    </div>
                    <div>
                      <div class="text-cursor-comment text-xs mb-1">Palavras</div>
                      <div class="text-purple-400 font-semibold">
                        {session.wordsRead.toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>

                  {#if session.chaptersRead.length > 0}
                    <div class="mt-3 pt-3 border-t border-cursor-border">
                      <div class="text-cursor-comment text-xs mb-1">Capítulos lidos</div>
                      <div class="text-xs text-cursor-text">
                        {session.chaptersRead.length} capítulo{session.chaptersRead.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>

        <!-- Summary -->
        <div class="mt-6 pt-6 border-t border-cursor-border bg-cursor-sidebar/30 rounded-lg p-4">
          <div class="flex items-center justify-between text-sm">
            <div class="text-cursor-comment">
              Total de {filteredSessions.length} {filteredSessions.length === 1 ? 'sessão' : 'sessões'}:
            </div>
            <div class="text-green-400 font-semibold">
              {formatDuration(filteredSessions.reduce((sum, s) => sum + s.duration, 0))}
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
