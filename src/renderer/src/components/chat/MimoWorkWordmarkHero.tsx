import type { ReactElement } from 'react'
import baiWorkMark from '../../../../asset/img/bai-work-mark.png?inline'
import baiWorkWordmark from '../../../../asset/img/bai-work-wordmark.png?inline'

export function MimoWorkSvgWordmark(): ReactElement {
  return (
    <div className="flex items-center justify-center" role="img" aria-label="BAI Work">
      <img
        className="ds-bai-work-wordmark"
        src={baiWorkWordmark}
        alt=""
        draggable={false}
        decoding="async"
      />
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
      <img className="ds-bai-work-mini-image" src={baiWorkMark} alt="" draggable={false} decoding="async" />
    </span>
  )
}
