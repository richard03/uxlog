/**
 * Composable pro deadline a aktivitní utility.
 * Zabaluje lib/ funkce pro použití ve views.
 */

import { daysRemaining, countUncheckedItems, todayISO, addDays } from '../lib/deadline.js'
import { isActivityOverdue } from '../lib/activity.js'

export function useDeadline() {
  return {
    daysRemaining,
    countUncheckedItems,
    todayISO,
    addDays,
    isActivityOverdue,
  }
}
