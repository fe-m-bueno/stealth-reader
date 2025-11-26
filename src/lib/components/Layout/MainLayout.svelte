<script lang="ts">
  import ActivityBar from './ActivityBar.svelte';
  import Sidebar from './Sidebar.svelte';
  import StatusBar from './StatusBar.svelte';
  import TitleBar from './TitleBar.svelte';
  import EditorPane from '../Editor/EditorPane.svelte';

  let sidebarComponent: Sidebar;

  function handleUploadShortcut() {
    if (sidebarComponent) {
      sidebarComponent.triggerFileSelect();
    }
  }
</script>

<div class="flex flex-col h-screen w-screen bg-vscode-bg text-vscode-text overflow-hidden">
  <!-- Title Bar -->
  <TitleBar {handleUploadShortcut} />

  <!-- Main Area -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Activity Bar -->
    <ActivityBar />

    <!-- Sidebar -->
    <Sidebar bind:this={sidebarComponent} />

    <!-- Editor Area -->
    <div class="flex-1 flex flex-col min-w-0">
      <EditorPane />
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

