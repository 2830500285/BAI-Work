import type { ReactElement } from 'react'
import baiWorkMark from '../../../../asset/img/bai-work-source.png?inline'

export function MimoWorkSvgWordmark(): ReactElement {
  return (
    <div className="flex items-center justify-center gap-3" role="img" aria-label="BAI Work">
      <img className="h-16 w-16 object-contain" src={baiWorkMark} alt="" draggable={false} decoding="async" />
      <span
        className="text-[34px] font-semibold leading-none tracking-normal text-ds-ink dark:text-ds-ink"
        style={{
          fontFamily:
            '"SF Pro Display", "SF Pro Text", Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'
        }}
      >
        Work
      </span>
    </div>
  )
}

export function MimoWorkWordmarkHero(): ReactElement {
  return (
    <div className="ds-mimo-wordmark-hero">
      <MimoWorkSvgWordmark />
    </div>
  )
}

export function MimoWorkMiniMark({ active = false }: { active?: boolean }): ReactElement {
  return (
    <span className={active ? 'ds-mimo-mini-mark is-active' : 'ds-mimo-mini-mark'} aria-hidden="true">
      <img src={baiWorkMark} alt="" draggable={false} decoding="async" />
    </span>
  )
}
