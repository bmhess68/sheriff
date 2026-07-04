document.addEventListener("DOMContentLoaded", () => {
    const hamburger = document.getElementById("hamburger");
    const navMenu = document.getElementById("nav-menu");
    const navbar = document.getElementById("navbar");
    const navLinks = Array.from(document.querySelectorAll(".nav-link"));

    if (hamburger && navMenu) {
        hamburger.addEventListener("click", () => {
            const isOpen = navMenu.classList.toggle("active");
            hamburger.classList.toggle("active", isOpen);
            hamburger.setAttribute("aria-expanded", String(isOpen));
            hamburger.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
        });

        navLinks.forEach((link) => {
            link.addEventListener("click", () => {
                navMenu.classList.remove("active");
                hamburger.classList.remove("active");
                hamburger.setAttribute("aria-expanded", "false");
                hamburger.setAttribute("aria-label", "Open navigation");
            });
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener("click", (event) => {
            const selector = anchor.getAttribute("href");
            if (!selector || selector === "#") return;

            const target = document.querySelector(selector);
            if (!target) return;

            event.preventDefault();
            const offsetTop = target.getBoundingClientRect().top + window.scrollY - 76;
            window.scrollTo({ top: offsetTop, behavior: "smooth" });
        });
    });

    const updateNavbar = () => {
        if (!navbar) return;
        navbar.style.backgroundColor = window.scrollY > 80
            ? "rgba(23, 32, 51, 0.99)"
            : "rgba(23, 32, 51, 0.96)";
    };

    updateNavbar();
    window.addEventListener("scroll", updateNavbar, { passive: true });

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    document.querySelectorAll(".info-card, .resource-card, .news-item, .gallery-item, .stat").forEach((element) => {
        element.classList.add("fade-in");
        revealObserver.observe(element);
    });

    const sections = Array.from(document.querySelectorAll("main section[id]"));
    const setActiveLink = () => {
        const current = sections.reduce((active, section) => {
            const top = section.getBoundingClientRect().top;
            return top <= 120 ? section.id : active;
        }, sections[0]?.id || "");

        navLinks.forEach((link) => {
            link.classList.toggle("active", link.getAttribute("href") === `#${current}`);
        });
    };

    setActiveLink();
    window.addEventListener("scroll", setActiveLink, { passive: true });

    document.querySelectorAll(".gallery-item img").forEach((image) => {
        image.addEventListener("click", () => {
            const overlay = document.createElement("div");
            overlay.className = "lightbox-overlay";

            const fullImage = document.createElement("img");
            fullImage.src = image.src;
            fullImage.alt = image.alt;

            overlay.appendChild(fullImage);
            document.body.appendChild(overlay);

            const close = () => overlay.remove();
            overlay.addEventListener("click", close);

            document.addEventListener("keydown", function closeOnEscape(event) {
                if (event.key === "Escape") {
                    close();
                    document.removeEventListener("keydown", closeOnEscape);
                }
            });
        });
    });
});
