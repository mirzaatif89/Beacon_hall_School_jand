(() => {
  "use strict";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const menu = document.querySelector(".menu");
  const nav = document.querySelector(".navlinks");
  function closeMenu() {
    nav.classList.remove("open");
    menu.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-label", "Open navigation");
  }
  menu.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menu.setAttribute("aria-expanded", String(open));
    menu.setAttribute(
      "aria-label",
      open ? "Close navigation" : "Open navigation"
    );
  });
  nav
    .querySelectorAll("a")
    .forEach((a) => a.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("open")) {
      closeMenu();
      menu.focus();
    }
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest("header")) closeMenu();
  });
  document.querySelector("#year").textContent = new Date().getFullYear();
  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.08 }
    );
    document
      .querySelectorAll(".reveal")
      .forEach((element) => observer.observe(element));
    document.body.classList.add("motion-ready");
  }
  const progress = document.querySelector(".scroll-progress");
  let scheduled = false;
  function updateProgress() {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${
      total > 0 ? window.scrollY / total : 0
    })`;
    scheduled = false;
  }
  window.addEventListener(
    "scroll",
    () => {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(updateProgress);
      }
    },
    { passive: true }
  );
  window.addEventListener("resize", updateProgress);
  updateProgress();
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelectorAll("[data-tilt]").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        if (reduceMotion.matches) return;
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(1000px) rotateX(${
          -y * 7
        }deg) rotateY(${x * 7}deg) translateY(-4px)`;
      });
      card.addEventListener("pointerleave", () => {
        card.style.transform = "";
      });
    });
    const art = document.querySelector(".hero-art");
    const book = document.querySelector(".book");
    if (art && book) art.addEventListener("pointermove", (event) => {
      if (reduceMotion.matches) return;
      const rect = art.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      book.style.transform = `rotateY(${-23 + x * 18}deg) rotateX(${
        12 - y * 14
      }deg) rotateZ(-11deg)`;
    });
    if (art && book) art.addEventListener("pointerleave", () => {
      book.style.transform = "";
    });
  }
  const stages = {
    early: {
      label: "THE JOY OF A FIRST DISCOVERY",
      title: "Small hands.\nWonderful big ideas.",
      copy: "A gentle introduction to school life through play, stories, creative activities and friendships. Building confidence begins with feeling safe, happy and understood.",
      image: "2",
      alt: "Young children participating in school life",
    },
    primary: {
      label: "BUILDING STRONG FOUNDATIONS",
      title: "Growing minds.\nGrowing confidence.",
      copy: "Building foundations in reading, writing and numeracy while encouraging children to ask questions, share ideas and learn with others. Every discovery is a step towards independence.",
      image: "34",
      alt: "Beacon Light students learning together",
    },
    senior: {
      label: "READY FOR THE NEXT CHAPTER",
      title: "Bigger questions.\nBrighter possibilities.",
      copy: "As learners grow, so do their opportunities to think independently, express themselves and take responsibility. A focus on knowledge, character and confidence helps them look ahead.",
      image: "16",
      alt: "Students expressing themselves at a school event",
    },
  };
  const tabs = Array.from(document.querySelectorAll("[data-stage]"));
  function selectStage(tab) {
    tabs.forEach((item) => {
      const active = item === tab;
      item.setAttribute("aria-selected", String(active));
      item.tabIndex = active ? 0 : -1;
    });
    const stage = stages[tab.dataset.stage];
    document.querySelector("#stage-label").textContent = stage.label;
    const title = document.querySelector("#stage-title");
    title.replaceChildren();
    stage.title.split("\n").forEach((line, i) => {
      if (i) title.append(document.createElement("br"));
      title.append(document.createTextNode(line));
    });
    document.querySelector("#stage-copy").textContent = stage.copy;
    const image = document.querySelector("#stage-image");
    image.src = `images_for_website/1%20(${stage.image}).jpeg`;
    image.alt = stage.alt;
    document
      .querySelector("#learning-panel")
      .setAttribute("aria-labelledby", tab.id);
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectStage(tab));
    tab.addEventListener("keydown", (event) => {
      let next;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft")
        next = (index + tabs.length - 1) % tabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        tabs[next].focus();
        selectStage(tabs[next]);
      }
    });
  });
  const lightbox = document.querySelector("#lightbox");
  document.querySelectorAll(".gallery-item").forEach((button) =>
    button.addEventListener("click", () => {
      const source = button.querySelector("img");
      lightbox.querySelector("img").src = source.src;
      lightbox.querySelector("img").alt = source.alt;
      lightbox.querySelector("p").textContent = button.dataset.caption;
      lightbox.showModal();
    })
  );
  lightbox
    .querySelector("button")
    .addEventListener("click", () => lightbox.close());
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      const rect = lightbox.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        lightbox.close();
    }
  });
  // School-managed banners remain available without hiding the main introduction.
  async function loadSchoolBanners() {
    try {
      const response = await fetch("/api/banners");
      if (!response.ok) return;
      const data = await response.json();
      const banners = (Array.isArray(data.banners) ? data.banners : [])
        .filter((banner) => banner.isActive !== false && banner.imageUrl)
        .sort(
          (a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0)
        );
      const safeBanners = banners.filter((banner) => {
        try {
          return ["http:", "https:"].includes(
            new URL(banner.imageUrl, location.href).protocol
          );
        } catch {
          return false;
        }
      });
      if (!safeBanners.length) return;
      const section = document.createElement("section");
      section.className = "school-updates section";
      section.setAttribute("aria-label", "School announcements");
      const wrap = document.createElement("div");
      wrap.className = "wrap";
      const label = document.createElement("p");
      label.className = "eyebrow";
      label.textContent = "LATEST FROM BEACON LIGHT";
      const image = document.createElement("img");
      image.loading = "lazy";
      image.style.cssText =
        "width:100%;max-height:560px;object-fit:contain;background:#edf0e5";
      const controls = document.createElement("div");
      controls.className = "banner-controls";
      controls.style.cssText =
        "display:flex;align-items:center;justify-content:center;gap:20px;margin-top:20px";
      const previous = document.createElement("button");
      previous.textContent = "←";
      previous.setAttribute("aria-label", "Previous announcement");
      const next = document.createElement("button");
      next.textContent = "→";
      next.setAttribute("aria-label", "Next announcement");
      const count = document.createElement("span");
      count.setAttribute("aria-live", "polite");
      let index = 0;
      const show = () => {
        image.src = safeBanners[index].imageUrl;
        image.alt =
          safeBanners[index].title || "Beacon Light school announcement";
        count.textContent = `${index + 1} / ${safeBanners.length}`;
      };
      previous.addEventListener("click", () => {
        index = (index + safeBanners.length - 1) % safeBanners.length;
        show();
      });
      next.addEventListener("click", () => {
        index = (index + 1) % safeBanners.length;
        show();
      });
      controls.append(previous, count, next);
      wrap.append(label, image);
      if (safeBanners.length > 1) wrap.append(controls);
      section.append(wrap);
      document.querySelector(".ticker").after(section);
      show();
    } catch {
      /* The full homepage remains available when the API is offline. */
    }
  }
  loadSchoolBanners();
})();
