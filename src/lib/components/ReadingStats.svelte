<script lang="ts">
  import ReadingDashboard from './ReadingDashboard.svelte';
  import ReadingHeatmap from './ReadingHeatmap.svelte';
  import ReadingSessions from './ReadingSessions.svelte';
  import { BarChart3, Map, Clock } from 'lucide-svelte';

  let activeTab = $state<'dashboard' | 'heatmap' | 'sessions'>('dashboard');
  let sessionsFilter: 'all' | 'today' | 'week' | string = $state('all');
  
  function handleModalOpen(filter: 'all' | 'today' | 'week' | string) {
    sessionsFilter = filter;
    activeTab = 'sessions';
  }
</script>

<div class="h-full flex flex-col bg-cursor-bg text-cursor-text">
  <!-- Tab Navigation -->
  <div class="flex border-b border-white/5 bg-cursor-panel/30">
    <button
      class="flex items-center gap-2 px-6 py-3 border-b-2 transition-all relative {activeTab === 'dashboard' ? 'border-cursor-accent text-cursor-accent bg-cursor-bg/50' : 'border-transparent text-cursor-comment hover:text-cursor-text hover:bg-cursor-bg/30'}"
      onclick={() => activeTab = 'dashboard'}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activeTab = 'dashboard';
        }
      }}
      role="tab"
      aria-selected={activeTab === 'dashboard'}
      aria-controls="dashboard-panel"
    >
      <BarChart3 size={16} />
      <span>Dashboard</span>
      {#if activeTab === 'dashboard'}
        <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-cursor-accent"></div>
      {/if}
    </button>
    <button
      class="flex items-center gap-2 px-6 py-3 border-b-2 transition-all relative {activeTab === 'heatmap' ? 'border-cursor-accent text-cursor-accent bg-cursor-bg/50' : 'border-transparent text-cursor-comment hover:text-cursor-text hover:bg-cursor-bg/30'}"
      onclick={() => activeTab = 'heatmap'}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activeTab = 'heatmap';
        }
      }}
      role="tab"
      aria-selected={activeTab === 'heatmap'}
      aria-controls="heatmap-panel"
    >
      <Map size={16} />
      <span>Heatmap</span>
      {#if activeTab === 'heatmap'}
        <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-cursor-accent"></div>
      {/if}
    </button>
    <button
      class="flex items-center gap-2 px-6 py-3 border-b-2 transition-all relative {activeTab === 'sessions' ? 'border-cursor-accent text-cursor-accent bg-cursor-bg/50' : 'border-transparent text-cursor-comment hover:text-cursor-text hover:bg-cursor-bg/30'}"
      onclick={() => activeTab = 'sessions'}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activeTab = 'sessions';
        }
      }}
      role="tab"
      aria-selected={activeTab === 'sessions'}
      aria-controls="sessions-panel"
    >
      <Clock size={16} />
      <span>Sessões</span>
      {#if activeTab === 'sessions'}
        <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-cursor-accent"></div>
      {/if}
    </button>
  </div>

  <!-- Tab Content -->
  <div class="flex-1 overflow-hidden min-h-0">
    {#if activeTab === 'dashboard'}
      <div id="dashboard-panel" role="tabpanel" aria-labelledby="dashboard-tab" class="h-full">
        <ReadingDashboard onModalOpen={handleModalOpen} />
      </div>
    {:else if activeTab === 'heatmap'}
      <div id="heatmap-panel" role="tabpanel" aria-labelledby="heatmap-tab" class="h-full">
        <ReadingHeatmap />
      </div>
    {:else if activeTab === 'sessions'}
      <div id="sessions-panel" role="tabpanel" aria-labelledby="sessions-tab" class="h-full">
        <ReadingSessions filter={sessionsFilter} />
      </div>
    {/if}
  </div>
</div>
