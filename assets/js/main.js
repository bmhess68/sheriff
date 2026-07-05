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
            const href = link.getAttribute("href") || "";
            if (href.startsWith("#")) {
                link.classList.toggle("active", href === `#${current}`);
            }
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

    document.querySelectorAll(".signature-pad").forEach((canvas) => {
        const context = canvas.getContext("2d");
        const hiddenInput = document.getElementById("signature_data");
        const clearButton = document.querySelector("[data-clear-signature]");
        let drawing = false;
        let hasSignature = false;

        const resizeCanvas = () => {
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            const { width, height } = canvas.getBoundingClientRect();
            canvas.width = width * ratio;
            canvas.height = height * ratio;
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            context.lineWidth = 2.5;
            context.lineCap = "round";
            context.lineJoin = "round";
            context.strokeStyle = "#172033";
        };

        const position = (event) => {
            const rect = canvas.getBoundingClientRect();
            const point = event.touches?.[0] || event;
            return {
                x: point.clientX - rect.left,
                y: point.clientY - rect.top
            };
        };

        const start = (event) => {
            event.preventDefault();
            drawing = true;
            const point = position(event);
            context.beginPath();
            context.moveTo(point.x, point.y);
        };

        const move = (event) => {
            if (!drawing) return;
            event.preventDefault();
            const point = position(event);
            context.lineTo(point.x, point.y);
            context.stroke();
            hasSignature = true;
            if (hiddenInput) hiddenInput.value = canvas.toDataURL("image/png");
        };

        const stop = () => {
            drawing = false;
            if (hasSignature && hiddenInput) hiddenInput.value = canvas.toDataURL("image/png");
        };

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);
        canvas.addEventListener("mousedown", start);
        canvas.addEventListener("mousemove", move);
        window.addEventListener("mouseup", stop);
        canvas.addEventListener("touchstart", start, { passive: false });
        canvas.addEventListener("touchmove", move, { passive: false });
        window.addEventListener("touchend", stop);

        clearButton?.addEventListener("click", () => {
            context.clearRect(0, 0, canvas.width, canvas.height);
            hasSignature = false;
            if (hiddenInput) hiddenInput.value = "";
        });
    });

    document.querySelectorAll("form[data-api-form]").forEach((form) => {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const formType = form.dataset.apiForm;
            const status = form.querySelector(".form-status");
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton?.textContent || "Submit";
            const signatureInput = form.querySelector("#signature_data");
            const rawFormData = new FormData(form);
            const isMultipart = form.enctype === "multipart/form-data";
            const body = isMultipart ? rawFormData : JSON.stringify(Object.fromEntries(rawFormData.entries()));

            if (status) {
                status.className = "form-status";
                status.textContent = "";
            }

            if (signatureInput && !signatureInput.value) {
                if (status) {
                    status.className = "form-status error";
                    status.textContent = "Please draw your signature before submitting.";
                }
                return;
            }

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = "Submitting...";
            }

            try {
                const response = await fetch(`/api/forms/${formType}`, {
                    method: "POST",
                    headers: isMultipart ? undefined : { "Content-Type": "application/json" },
                    body
                });
                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "Submission failed. Please try again.");
                }

                form.reset();
                document.querySelector("[data-clear-signature]")?.click();
                if (status) {
                    status.className = "form-status success";
                    status.textContent = result.message || "Thank you. Your submission was received.";
                }
            } catch (error) {
                if (status) {
                    status.className = "form-status error";
                    status.textContent = error.message || "There was a problem submitting the form.";
                }
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = originalText;
                }
            }
        });
    });
});
