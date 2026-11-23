"use strict";

function wireGalleryTabs(group, onManualSelect) {
  if (!group) return null;
  const tabs = [...group.querySelectorAll(":scope > [role=tab]")];
  const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));
  if (!tabs.length || panels.some((panel) => !panel)) return null;

  let activeIndex;

  function select(index) {
    if (activeIndex === index) return;
    activeIndex = index;
    tabs.forEach((tab, position) => {
      const selected = position === index;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[position].hidden = !selected;
    });
  }

  tabs.forEach((tab, index) => {
    const panel = panels[index];
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tab.id);
    panel.tabIndex = 0;
    tab.addEventListener("click", () => {
      select(index);
      onManualSelect();
    });
    tab.addEventListener("keydown", (event) => {
      let next;
      switch (event.key) {
        case "ArrowLeft": next = (index + tabs.length - 1) % tabs.length; break;
        case "ArrowRight": next = (index + 1) % tabs.length; break;
        case "Home": next = 0; break;
        case "End": next = tabs.length - 1; break;
        default: return;
      }
      event.preventDefault();
      select(next);
      onManualSelect();
      tabs[next].focus();
    });
  });

  select(0);
  group.hidden = false;
  return { panels, select, get index() { return activeIndex; } };
}

function initializeGallery(gallery) {
  const controls = gallery.querySelector("[data-gallery-controls]");
  const toggle = controls.querySelector("[data-gallery-toggle]");
  const position = controls.querySelector("[data-gallery-position]");
  const progress = controls.querySelector("[data-gallery-progress]");
  const content = gallery.querySelector("[data-gallery-content]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const delay = 8000;
  let playing = !reducedMotion.matches;
  let inView = !("IntersectionObserver" in window);
  let hovered = false;
  let timer;
  let progressAnimation;

  const topics = wireGalleryTabs(content.querySelector(".gallery-topics"), pause);
  if (!topics) return;
  const figures = topics.panels.map((panel) => wireGalleryTabs(panel.querySelector(".gallery-figures"), pause));
  if (figures.some((group) => !group)) return;
  const highlights = figures.flatMap((group, topic) => group.panels.map((_, figure) => ({ topic, figure })));
  if (highlights.length < 2) return;

  function currentHighlight() {
    return highlights.findIndex(({ topic, figure }) => topic === topics.index && figure === figures[topic].index);
  }

  function step(direction) {
    const next = (currentHighlight() + direction + highlights.length) % highlights.length;
    const { topic, figure } = highlights[next];
    figures[topic].select(figure);
    topics.select(topic);
  }

  function updateRotation() {
    window.clearTimeout(timer);
    progressAnimation?.cancel();
    progressAnimation = undefined;

    const buttonLabel = playing ? "Pause rotation" : "Play rotation";
    if (toggle.textContent !== buttonLabel) toggle.textContent = buttonLabel;
    position.setAttribute("aria-live", playing ? "off" : "polite");
    const status = "Highlight " + (currentHighlight() + 1) + " of " + highlights.length;
    if (position.textContent !== status) position.textContent = status;

    if (!playing || !inView || hovered || document.hidden) return;

    if (!reducedMotion.matches && typeof progress.animate === "function") {
      progressAnimation = progress.animate(
        [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
        { duration: delay, fill: "forwards" }
      );
    }
    timer = window.setTimeout(() => {
      step(1);
      updateRotation();
    }, delay);
  }

  function pause() {
    playing = false;
    updateRotation();
  }

  function manualStep(direction) {
    playing = false;
    step(direction);
    updateRotation();
  }

  toggle.addEventListener("click", () => {
    playing = !playing;
    updateRotation();
  });
  controls.querySelector("[data-gallery-previous]").addEventListener("click", () => manualStep(-1));
  controls.querySelector("[data-gallery-next]").addEventListener("click", () => manualStep(1));

  gallery.addEventListener("focusin", (event) => {
    if (event.target !== toggle && playing) pause();
  });
  content.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "mouse") return;
    hovered = true;
    updateRotation();
  });
  content.addEventListener("pointerleave", (event) => {
    if (event.pointerType !== "mouse") return;
    hovered = false;
    updateRotation();
  });

  document.addEventListener("visibilitychange", updateRotation);
  reducedMotion.addEventListener("change", (event) => {
    if (event.matches) pause();
  });

  if ("IntersectionObserver" in window) {
    const observer = new window.IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting && entry.intersectionRatio >= 0.2;
      updateRotation();
    }, { threshold: 0.2 });
    observer.observe(gallery);
  }

  controls.hidden = false;
  updateRotation();
}

const researchGallery = document.querySelector("[data-research-gallery]");
if (researchGallery) initializeGallery(researchGallery);
