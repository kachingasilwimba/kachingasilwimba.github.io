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
    if (group.scrollWidth > group.clientWidth) {
      const track = group.getBoundingClientRect();
      const tab = tabs[index].getBoundingClientRect();
      group.scrollLeft += Math.min(0, tab.left - track.left) + Math.max(0, tab.right - track.right);
    }
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

function wireFigureViewer(gallery, pause) {
  const viewer = gallery.querySelector("[data-gallery-viewer]");
  if (typeof viewer?.showModal !== "function") return;

  const title = viewer.querySelector("h3");
  const canvas = viewer.querySelector("[data-gallery-canvas]");
  const image = canvas.querySelector("img");
  const zoom = viewer.querySelector("[data-gallery-zoom]");
  const original = viewer.querySelector("[data-gallery-original]");
  let trigger;

  gallery.querySelectorAll("[data-gallery-inspect]").forEach((link) => {
    link.setAttribute("aria-haspopup", "dialog");
  });

  function updateZoom() {
    canvas.dataset.zoom = zoom.value;
    canvas.scrollTop = 0;
    canvas.scrollLeft = 0;
  }

  gallery.addEventListener("click", (event) => {
    const link = event.target.closest("[data-gallery-inspect]");
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    pause();
    trigger = link;
    const preview = link.querySelector("img");
    const stage = link.closest(".gallery-stage");
    const width = preview.getAttribute("width");
    title.textContent = stage.querySelector(".kicker").textContent + " · " + stage.querySelector("[data-gallery-figure-title]").textContent;
    image.alt = preview.alt;
    image.width = Number(width);
    image.height = Number(preview.getAttribute("height"));
    image.src = link.href;
    original.href = link.href;
    canvas.style.setProperty("--figure-width", width + "px");
    zoom.value = "fit";
    viewer.showModal();
    updateZoom();
  });

  zoom.addEventListener("change", updateZoom);
  viewer.addEventListener("close", () => trigger?.focus({ preventScroll: true }));
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
    topics.select(topic);
    figures[topic].select(figure);
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
  wireFigureViewer(gallery, pause);

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
