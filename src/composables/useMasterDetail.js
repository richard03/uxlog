/**
 * Seznam + detail na jedné obrazovce (EntityMasterDetail).
 * Obal poskytuje seznamu vlevo informaci, zda je vpravo otevřený detail – hlavička obrazovky
 * seznamu (ProjectPageHeader) se pak nevykreslí a nahoře je hlavička detailu (drobky až k položce).
 */

import { inject } from 'vue'

export const MASTER_LIST_KEY = Symbol('uxlog-master-list')

/**
 * @returns {{ detailOpen: import('vue').Ref<boolean> } | null} null mimo seznam v obalu
 */
export function useMasterList() {
  return inject(MASTER_LIST_KEY, null)
}
