export function scrollSegmentTabIntoView(button: HTMLElement, pad = 8): void {
  const track = button.closest<HTMLElement>("[data-segment-track]");
  if (!track) return;

  const maxScroll = track.scrollWidth - track.clientWidth;
  if (maxScroll <= 0) return;

  const btnLeft = button.offsetLeft;
  const btnRight = btnLeft + button.offsetWidth;
  const viewLeft = track.scrollLeft;
  const viewRight = viewLeft + track.clientWidth;

  if (btnRight > viewRight - pad) {
    track.scrollLeft = Math.min(maxScroll, btnRight - track.clientWidth + pad);
  } else if (btnLeft < viewLeft + pad) {
    track.scrollLeft = Math.max(0, btnLeft - pad);
  }
}