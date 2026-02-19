<script lang="ts">
  interface Props {
    text: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
  }

  let { text, position = 'top' }: Props = $props();
  let showTooltip = $state(false);
  let tooltipElement: HTMLDivElement;

  function getPositionClasses(): string {
    switch (position) {
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      default: // top
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
    }
  }
</script>

<div
  class="relative inline-block"
  onmouseenter={() => showTooltip = true}
  onmouseleave={() => showTooltip = false}
  onfocus={() => showTooltip = true}
  onblur={() => showTooltip = false}
>
  <slot />
  {#if showTooltip}
    <div
      bind:this={tooltipElement}
      class="absolute z-50 px-3 py-2 text-xs bg-cursor-panel border border-white/5 rounded shadow-lg max-w-xs {getPositionClasses()}"
      role="tooltip"
    >
      <div class="text-cursor-text whitespace-pre-line">{text}</div>
      <!-- Arrow -->
      {#if position === 'top'}
        <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white/5"></div>
      {:else if position === 'bottom'}
        <div class="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-white/5"></div>
      {:else if position === 'left'}
        <div class="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-white/5"></div>
      {:else if position === 'right'}
        <div class="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-white/5"></div>
      {/if}
    </div>
  {/if}
</div>








