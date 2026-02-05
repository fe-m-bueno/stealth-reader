<script lang="ts">
  import ActivityBar from './ActivityBar.svelte';
  import Sidebar from './Sidebar.svelte';
  import StatusBar from './StatusBar.svelte';
  import TitleBar from './TitleBar.svelte';
  import EditorPane from '../Editor/EditorPane.svelte';
  import ReadingStats from '../ReadingStats.svelte';
  import { bookStore } from '../../stores/book.svelte';

  let sidebarComponent: Sidebar;
  let showStats = $state(false);

  function handleUploadShortcut() {
    if (sidebarComponent) {
      sidebarComponent.triggerFileSelect();
    }
  }

  function handleSearchClick() {
    bookStore.openSearch();
  }

  function handleStatsClick() {
    showStats = !showStats;
  }
</script>

<div class="flex flex-col h-screen w-screen bg-cursor-bg text-cursor-text overflow-hidden">
  <!-- Title Bar -->
  <TitleBar {handleUploadShortcut} />

  <!-- Main Area -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Activity Bar -->
    <ActivityBar onSearchClick={handleSearchClick} onStatsClick={handleStatsClick} />

    <!-- Sidebar -->
    <Sidebar bind:this={sidebarComponent} />

    <!-- Editor Area -->
    <div class="flex-1 flex flex-col min-w-0">
      {#if showStats}
        <ReadingStats />
      {:else}
        <EditorPane />
      {/if}
    </div>
  </div>

  <!-- Status Bar -->
  <StatusBar />
</div>

<svelte:window onkeydown={(e) => {
  if (e.ctrlKey && e.shiftKey && (e.key === 'o' || e.key === 'O')) {
    e.preventDefault();
    handleUploadShortcut();
  }
}} />

