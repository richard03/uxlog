/**
 * Probíhající požadavky na AI pro UI: počet a zrušení (tlačítko Zrušit u „AI pracuje…“).
 * Časový limit a zrušení řeší `lib/plugins/ai-shared/request.js`.
 */

import { computed } from 'vue'
import { aiRequestsRunning, cancelAiRequests } from '../lib/plugins/ai-shared/request.js'

export function useAiRequests() {
  const running = computed(() => aiRequestsRunning.value > 0)
  return { running, cancel: cancelAiRequests }
}
