'use client'

import { createContext, useContext } from 'react'

export const TeamCtx = createContext({ me: null, refresh: () => {} })
export const useTeam = () => useContext(TeamCtx)
