<script lang="ts">
  import { Files, Search, GitGraph, Play, SquareDashed, Settings, User, Pause, BarChart3 } from 'lucide-svelte';
  import { bookStore } from '../../stores/book.svelte';
  import { readingStatsService } from '../../services/reading-stats';

  interface Props {
    onSearchClick?: () => void;
    onStatsClick?: () => void;
  }

  let { onSearchClick, onStatsClick }: Props = $props();

  let isReading = $state(false);
  let readingTime = $state(0);
  let startDate = $state<Date | null>(null);
  let timerInterval: number | null = null;

  $effect(() => {
    // Check if there's an active reading session on mount
    isReading = readingStatsService.isReading();

    if (isReading) {
      const session = readingStatsService.getCurrentSession();
      if (session) {
        startDate = new Date(session.startTime);
      }
      startTimer();
    }

    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  });

  function startTimer() {
    timerInterval = setInterval(() => {
      readingTime = readingStatsService.getCurrentReadingTime();
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function toggleReading() {
    const activeSession = bookStore.activeSession;

    if (!activeSession || !activeSession.currentChapter) {
      return; // Can't start reading without an active book
    }

    if (isReading) {
      // Stop reading
      readingStatsService.endReading();
      stopTimer();
      isReading = false;
      readingTime = 0;
      startDate = null;
    } else {
      // Start reading
      const wordsRead = activeSession.currentCode.length; // Rough estimate
      const chaptersRead = [activeSession.currentChapter.id];

      readingStatsService.startReading(activeSession.bookId, wordsRead, chaptersRead);
      startDate = new Date();
      startTimer();
      isReading = true;
    }
  }

  function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  function formatDateTime(date: Date | null): string {
    if (!date) return '';
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
</script>

<div class="w-12 bg-cursor-panel flex flex-col items-center py-2 justify-between h-full border-r border-white/5 z-10">
  <div class="flex flex-col gap-0 w-full">
    <div class="h-12 w-full flex items-center justify-center border-l-2 border-white cursor-pointer bg-cursor-bg/10">
      <Files size={24} color="white" strokeWidth={1.5} />
    </div>
    <div
      class="h-12 w-full flex items-center justify-center border-l-2 border-transparent opacity-60 hover:opacity-100 cursor-pointer"
      onclick={onSearchClick}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSearchClick?.();
        }
      }}
      role="button"
      tabindex="0"
      title="Buscar no livro"
      aria-label="Buscar no livro"
    >
      <Search size={24} color="#CCCCCC99" strokeWidth={1.5} />
    </div>
    <div class="h-12 w-full flex items-center justify-center border-l-2 border-transparent opacity-60 hover:opacity-100 cursor-pointer">
      <GitGraph size={24} color="#CCCCCC99" strokeWidth={1.5} />
    </div>
    <div
      class="h-auto min-h-[48px] w-full flex flex-col items-center justify-center border-l-2 border-transparent opacity-60 hover:opacity-100 cursor-pointer relative py-1"
      onclick={toggleReading}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleReading();
        }
      }}
      role="button"
      tabindex="0"
      title={isReading ? `Pausar leitura\nIniciado em: ${formatDateTime(startDate)}` : "Iniciar leitura"}
      aria-label={isReading ? "Pausar leitura" : "Iniciar leitura"}
    >
      {#if isReading}
        <Pause size={18} color="#4ade80" strokeWidth={2} />
      {:else}
        <Play size={18} color="#CCCCCC99" strokeWidth={1.5} />
      {/if}
      {#if isReading || readingTime > 0}
        <div class="text-[10px] text-green-400 font-mono mt-0.5 leading-tight text-center">
          <div>{formatTime(readingTime)}</div>
          {#if startDate}
            <div class="text-[9px] text-green-500/70 mt-0.5">
              {startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div class="text-[8px] text-green-500/60 mt-0.5">
              {startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            </div>
          {/if}
        </div>
      {/if}
    </div>
    <div
      class="h-12 w-full flex items-center justify-center border-l-2 border-transparent opacity-60 hover:opacity-100 cursor-pointer"
      onclick={onStatsClick}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onStatsClick?.();
        }
      }}
      role="button"
      tabindex="0"
      title="Ver estatísticas"
      aria-label="Ver estatísticas"
    >
      <BarChart3 size={24} color="#CCCCCC99" strokeWidth={1.5} />
    </div>
    <div class="h-12 w-full flex items-center justify-center border-l-2 border-transparent opacity-60 hover:opacity-100 cursor-pointer">
      <SquareDashed size={24} color="#CCCCCC99" strokeWidth={1.5} />
    </div>
  </div>

  <div class="flex flex-col gap-0 w-full mb-1">
    <div class="h-12 w-full flex items-center justify-center opacity-60 hover:opacity-100 cursor-pointer">
      <User size={24} color="#CCCCCC99" strokeWidth={1.5} />
    </div>
    <div class="h-12 w-full flex items-center justify-center opacity-60 hover:opacity-100 cursor-pointer">
      <Settings size={24} color="#CCCCCC99" strokeWidth={1.5} />
    </div>
  </div>
</div>

