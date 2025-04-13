// This file can be used to combine slices later if needed,
// but for now, individual feature stores will be created and used directly.
// Example structure if combining:
//
// import { create } from 'zustand';
// import { devtools } from 'zustand/middleware';
// import { createAuthSlice, AuthSlice } from '@/features/auth/store';
//
// export const useAppStore = create<AuthSlice /* & OtherSlices... */>()(
//   devtools(
//     (...a) => ({
//       ...createAuthSlice(...a),
//       // ...createOtherSlice(...a),
//     }),
//     { name: 'QanduAppStore' }
//   )
// );

// For now, just exporting a type placeholder might be useful
export type AppState = {
  // Define combined state shape here later if needed
}; 