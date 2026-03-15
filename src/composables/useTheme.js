import { onMounted } from 'vue'

export function useTheme() {
  onMounted(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
  })
}
