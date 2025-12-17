const cta = document.getElementById("ctaBtn");
    cta.addEventListener("click", (e) => {
      const rect = cta.getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      ripple.style.left = (e.clientX - rect.left) + "px";
      ripple.style.top  = (e.clientY - rect.top) + "px";
      ripple.style.width = ripple.style.height = Math.max(rect.width, rect.height) + "px";
      cta.appendChild(ripple);
      setTimeout(() => ripple.remove(), 650);
    });