<script lang="ts">
  import { onMount } from 'svelte';
  import { readingStatsService } from '../services/reading-stats';
  import { Info } from 'lucide-svelte';
  import Tooltip from './ui/Tooltip.svelte';

  let heatmapData = $state<Array<{ date: string; value: number }>>([]);
  let months = $state<string[]>([]);
  let selectedDay = $state<{ date: Date; value: number } | null>(null);

  onMount(() => {
    loadHeatmapData();
  });

  function loadHeatmapData() {
    heatmapData = readingStatsService.getDailyReadingData(365); // Last year
    generateMonths();
  }

  function generateMonths() {
    const now = new Date();
    months = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }));
    }
  }

  function getDaysInMonth(monthIndex: number): Date[] {
    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth() - (11 - monthIndex), 1);
    const daysInMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();

    const days: Date[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(targetMonth.getFullYear(), targetMonth.getMonth(), i));
    }
    return days;
  }

  function getReadingValueForDate(date: Date): number {
    const dateStr = date.toISOString().split('T')[0];
    const data = heatmapData.find(d => d.date === dateStr);
    return data ? data.value : 0;
  }

  function getIntensityClass(value: number): string {
    if (value === 0) return 'bg-cursor-bg/20 hover:bg-cursor-bg/30';
    if (value <= 15) return 'bg-green-900/40 hover:bg-green-900/60'; // Very light
    if (value <= 30) return 'bg-green-700/50 hover:bg-green-700/70'; // Light
    if (value <= 60) return 'bg-green-600/60 hover:bg-green-600/80'; // Medium
    if (value <= 120) return 'bg-green-500/70 hover:bg-green-500/90'; // Medium-high
    return 'bg-green-400/80 hover:bg-green-400/100'; // High
  }

  function getTooltipText(date: Date, value: number): string {
    const formattedDate = date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (value === 0) {
      return `${formattedDate}\nNenhum tempo de leitura registrado`;
    }

    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    return `${formattedDate}\n${timeStr} de leitura`;
  }

  function getTotalMinutes(): number {
    return heatmapData.reduce((sum, day) => sum + day.value, 0);
  }

  function getDaysWithReading(): number {
    return heatmapData.filter(day => day.value > 0).length;
  }

  function getAverageDailyMinutes(): number {
    const daysWithReading = getDaysWithReading();
    if (daysWithReading === 0) return 0;
    return Math.round(getTotalMinutes() / daysWithReading);
  }

  function getMaxDailyMinutes(): number {
    return Math.max(...heatmapData.map(d => d.value), 0);
  }
</script>

<div class="p-6 bg-cursor-bg text-cursor-text h-full overflow-y-auto editor-scroll-container">
  <div class="max-w-6xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold mb-2 flex items-center gap-2">
          <span>Heatmap de Leitura</span>
          <Tooltip text="Visualização dos seus padrões de leitura ao longo do ano. Cada quadrado representa um dia do ano. Cores mais escuras indicam mais tempo de leitura. Útil para identificar dias da semana e períodos em que você lê mais.">
            <Info size={18} class="text-cursor-comment cursor-help" />
          </Tooltip>
        </h2>
        <p class="text-sm text-cursor-comment">
          Visualize seus padrões de leitura ao longo do ano. Cada quadrado representa um dia.
        </p>
      </div>
    </div>

    <!-- Estatísticas do Heatmap -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-cursor-sidebar/50 border border-cursor-border rounded-lg p-4">
        <div class="text-xs text-cursor-comment mb-1">Total de Minutos</div>
        <div class="text-xl font-bold text-green-400">{getTotalMinutes()}</div>
      </div>
      <div class="bg-cursor-sidebar/50 border border-cursor-border rounded-lg p-4">
        <div class="text-xs text-cursor-comment mb-1">Dias com Leitura</div>
        <div class="text-xl font-bold text-blue-400">{getDaysWithReading()}</div>
      </div>
      <div class="bg-cursor-sidebar/50 border border-cursor-border rounded-lg p-4">
        <div class="text-xs text-cursor-comment mb-1">Média Diária</div>
        <div class="text-xl font-bold text-purple-400">{getAverageDailyMinutes()} min</div>
      </div>
      <div class="bg-cursor-sidebar/50 border border-cursor-border rounded-lg p-4">
        <div class="text-xs text-cursor-comment mb-1">Máximo Diário</div>
        <div class="text-xl font-bold text-orange-400">{getMaxDailyMinutes()} min</div>
      </div>
    </div>

    <!-- Legend -->
    <div class="bg-cursor-sidebar/50 border border-cursor-border rounded-lg p-4 mb-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <span class="text-sm text-cursor-comment">Intensidade:</span>
          <div class="flex items-center gap-2">
            <span class="text-xs text-cursor-comment">Menos</span>
            <div class="flex gap-1">
              <div class="w-4 h-4 rounded-sm bg-cursor-bg/20 border border-cursor-border"></div>
              <div class="w-4 h-4 rounded-sm bg-green-900/40 border border-cursor-border"></div>
              <div class="w-4 h-4 rounded-sm bg-green-700/50 border border-cursor-border"></div>
              <div class="w-4 h-4 rounded-sm bg-green-600/60 border border-cursor-border"></div>
              <div class="w-4 h-4 rounded-sm bg-green-500/70 border border-cursor-border"></div>
              <div class="w-4 h-4 rounded-sm bg-green-400/80 border border-cursor-border"></div>
            </div>
            <span class="text-xs text-cursor-comment">Mais</span>
          </div>
        </div>
        <div class="text-xs text-cursor-comment">
          <Tooltip text="Cores indicam minutos de leitura: Cinza = 0min, Verde escuro = 1-15min, Verde médio = 16-30min, Verde claro = 31-60min, Verde brilhante = 61-120min, Verde muito brilhante = 120+min">
            <span class="cursor-help underline decoration-dotted">Como ler</span>
          </Tooltip>
        </div>
      </div>
    </div>

    <!-- Heatmap Grid -->
    <div class="bg-cursor-sidebar/30 border border-cursor-border rounded-lg p-4 overflow-x-auto">
      <div class="inline-block min-w-max">
        <!-- Day labels -->
        <div class="flex mb-2 ml-8">
          {#each ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as day}
            <div class="w-4 text-xs text-cursor-comment text-center mx-0.5">{day}</div>
          {/each}
        </div>

        <div class="flex gap-2">
          {#each months as month, monthIndex}
            <div class="flex flex-col">
              <!-- Month label -->
              <div class="text-xs text-cursor-comment text-center mb-2 h-6 flex items-center justify-center font-medium">
                {month}
              </div>

              <!-- Days grid -->
              <div class="grid grid-cols-7 gap-1">
                {#each getDaysInMonth(monthIndex) as day}
                  {@const value = getReadingValueForDate(day)}
                  {@const dayOfWeek = day.getDay()}
                  <div
                    class="w-4 h-4 rounded-sm cursor-pointer transition-all border border-transparent hover:border-green-400/50 {getIntensityClass(value)}"
                    title={getTooltipText(day, value)}
                    onclick={() => selectedDay = { date: day, value }}
                    role="button"
                    tabindex="0"
                    onkeydown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectedDay = { date: day, value };
                      }
                    }}
                  ></div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Selected Day Info -->
    {#if selectedDay}
      <div class="mt-6 bg-cursor-sidebar/50 border border-green-500/50 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-cursor-comment mb-1">Dia Selecionado</div>
            <div class="text-lg font-semibold">
              {selectedDay.date.toLocaleDateString('pt-BR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            {#if selectedDay.value > 0}
              <div class="text-sm text-green-400 mt-1">
                {Math.floor(selectedDay.value / 60) > 0 ? `${Math.floor(selectedDay.value / 60)}h ` : ''}
                {selectedDay.value % 60}m de leitura
              </div>
            {:else}
              <div class="text-sm text-cursor-comment mt-1">
                Nenhum tempo de leitura registrado
              </div>
            {/if}
          </div>
          <button
            class="text-cursor-comment hover:text-cursor-text px-3 py-1 rounded border border-cursor-border hover:border-cursor-selection transition-colors"
            onclick={() => selectedDay = null}
          >
            Fechar
          </button>
        </div>
      </div>
    {/if}

    <!-- Dica -->
    <div class="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
      <div class="flex items-start gap-3">
        <Info size={18} class="text-blue-400 mt-0.5 flex-shrink-0" />
        <div class="text-sm text-cursor-text">
          <strong class="text-blue-400">Dica:</strong> Passe o mouse sobre os quadrados para ver detalhes de cada dia. 
          Clique em um quadrado para destacá-lo. Use esta visualização para identificar padrões como "leio mais nos fins de semana" 
          ou "tenho uma rotina consistente".
        </div>
      </div>
    </div>
  </div>
</div>