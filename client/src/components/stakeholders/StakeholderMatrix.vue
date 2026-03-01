<template>
  <div class="matrix-wrap">
    <svg :width="SIZE" :height="SIZE" class="matrix-svg">
      <!-- Grid lines -->
      <line :x1="MID" y1="0" :x2="MID" :y2="SIZE" stroke="#e5e7eb" stroke-width="1" />
      <line x1="0" :y1="MID" :x2="SIZE" :y2="MID" stroke="#e5e7eb" stroke-width="1" />
      <!-- Axis labels -->
      <text :x="SIZE/2" :y="SIZE - 4" text-anchor="middle" class="axis-label">Interest →</text>
      <text x="12" :y="SIZE/2" text-anchor="middle" class="axis-label"
            :transform="`rotate(-90, 12, ${SIZE/2})`">Power →</text>
      <!-- Quadrant labels -->
      <text x="8"          :y="18"      class="quad-label">High Power / Low Interest</text>
      <text :x="MID + 8"   :y="18"      class="quad-label">High Power / High Interest</text>
      <text x="8"          :y="MID + 18" class="quad-label">Low Power / Low Interest</text>
      <text :x="MID + 8"   :y="MID + 18" class="quad-label">Low Power / High Interest</text>

      <!-- Stakeholders -->
      <g v-for="s in stakeholders" :key="s.id">
        <circle
          :cx="toX(s.interest_rating)"
          :cy="toY(s.power_rating)"
          :r="12"
          :fill="s.color || '#4f46e5'"
          fill-opacity="0.7"
          stroke="#fff"
          stroke-width="1.5"
        />
        <text
          :x="toX(s.interest_rating)"
          :y="toY(s.power_rating) + 4"
          text-anchor="middle"
          class="dot-label"
        >{{ initials(s.name) }}</text>
        <title>{{ s.name }} (P:{{ s.power_rating }}, I:{{ s.interest_rating }})</title>
      </g>
    </svg>
    <div class="legend">
      <div v-for="s in stakeholders" :key="s.id" class="legend-item">
        <span class="dot" :style="{ background: s.color || '#4f46e5' }"></span>
        <span>{{ s.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
const SIZE = 340
const MID  = SIZE / 2
const PAD  = 28

const props = defineProps({
  stakeholders: { type: Array, default: () => [] },
})

function toX(interest) { return PAD + (interest / 10) * (SIZE - PAD * 2) }
function toY(power)    { return SIZE - PAD - (power / 10) * (SIZE - PAD * 2) }
function initials(name) { return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) }
</script>

<style scoped>
.matrix-wrap { display: flex; flex-direction: column; align-items: flex-start; gap: 1rem; }
.matrix-svg { border: 1px solid #e5e7eb; border-radius: 8px; background: #fafafa; }
.axis-label { font-size: 10px; fill: #9ca3af; }
.quad-label { font-size: 9px; fill: #d1d5db; }
.dot-label  { font-size: 9px; fill: #fff; font-weight: 600; }
.legend { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.legend-item { display: flex; align-items: center; gap: 0.3rem; font-size: 0.8rem; color: #374151; }
.dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
</style>
