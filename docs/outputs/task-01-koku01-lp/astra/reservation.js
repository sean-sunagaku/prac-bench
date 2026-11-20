(() => {
  "use strict";

  const header = document.querySelector(".site-header");
  const nav = document.getElementById("main-nav");
  const menu = document.querySelector(".menu-toggle");
  const specs = document.getElementById("specs");
  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    menu.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
  }
  menu.addEventListener("click", () => setMenu(menu.getAttribute("aria-expanded") !== "true"));
  header.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
    if (link.hash === "#specs") specs.open = true;
    setMenu(false);
  }));
  document.addEventListener("click", event => {
    if (!header.contains(event.target)) setMenu(false);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && menu.getAttribute("aria-expanded") === "true") {
      setMenu(false);
      menu.focus();
    }
  });
  matchMedia("(max-width: 760px)").addEventListener("change", () => setMenu(false));
  function revealLinkedSpecs() {
    if (location.hash === "#specs") specs.open = true;
  }
  revealLinkedSpecs();
  window.addEventListener("hashchange", revealLinkedSpecs);

  const form = document.getElementById("configurator");
  const total = document.getElementById("total");
  const photo = document.getElementById("finish-photo");
  const caption = document.getElementById("finish-caption");
  const swatch = document.getElementById("preview-swatch");
  const reviewButton = document.getElementById("review-button");
  const dialog = document.getElementById("review-dialog");
  const heading = document.getElementById("review-heading");
  const description = document.getElementById("review-description");
  const confirm = document.getElementById("confirm-demo");
  const edit = document.getElementById("edit-config");
  const formatter = new Intl.NumberFormat("ja-JP");
  const yen = amount => "¥" + formatter.format(amount);
  const earlyShipping = "2027年3月順次発送";
  let reviewState = "review";

  function selectedInput(name) {
    const available = [...form.elements.namedItem(name)].filter(input => !input.disabled);
    const selected = available.find(input => input.checked) || available[0];
    selected.checked = true;
    return selected;
  }

  function getSelection() {
    const finish = selectedInput("finish");
    const plan = selectedInput("plan");
    const mat = form.elements.namedItem("mat");
    const matPrice = mat.checked ? Number(mat.dataset.price) : 0;
    return {
      finish, plan, mat, matPrice,
      early: plan.value === "early",
      totalPrice: Number(finish.dataset.price) + Number(plan.dataset.price) + matPrice
    };
  }

  function updatePreview() {
    const selection = getSelection();
    const {finish, early, totalPrice} = selection;
    total.value = yen(totalPrice);
    if (photo.getAttribute("src") !== finish.dataset.photo) photo.src = finish.dataset.photo;
    photo.alt = "フェルトの上に置いた" + finish.dataset.name + "のKOKU-01";
    caption.textContent = finish.dataset.name;
    swatch.className = "swatch " + finish.value;
    reviewButton.querySelector("span").textContent = early ? "予約内容を確認する" : "見積もりを確認する";
    document.getElementById("plan-note").textContent = early ? earlyShipping : "一般販売予定価格での試算";
    return selection;
  }

  function openReview(event) {
    event.preventDefault();
    const {finish, plan, mat, matPrice, early, totalPrice} = updatePreview();
    reviewState = early ? "review" : "estimate";
    heading.textContent = early ? "予約内容の確認" : "一般販売の見積もり";
    description.textContent = early
      ? "選んだ仕上げと価格をご確認ください。この先は予約のデモです。"
      : "一般販売の予定価格で計算した見積もりです。";
    document.getElementById("review-plan").textContent = plan.dataset.name;
    document.getElementById("review-base").textContent = yen(Number(plan.dataset.price));
    document.getElementById("review-finish").textContent = finish.dataset.name;
    document.getElementById("review-color-price").textContent = Number(finish.dataset.price) ? "+" + yen(Number(finish.dataset.price)) : "基本価格";
    document.getElementById("review-mat").textContent = mat.checked ? mat.dataset.name : "なし";
    document.getElementById("review-mat-price").textContent = mat.checked ? "+" + yen(matPrice) : "¥0";
    document.getElementById("review-total").textContent = yen(totalPrice);
    document.getElementById("review-shipping").hidden = !early;
    edit.hidden = false;
    confirm.querySelector("span").textContent = early ? "この内容で予約を体験" : "閉じる";
    confirm.querySelector("use").setAttribute("href", early ? "#i-arrow" : "#i-close");
    dialog.showModal();
    heading.focus({preventScroll: true});
  }

  form.addEventListener("change", updatePreview);
  form.addEventListener("submit", openReview);
  edit.addEventListener("click", () => dialog.close());
  dialog.querySelector(".close-dialog").addEventListener("click", () => dialog.close());
  confirm.addEventListener("click", () => {
    if (reviewState !== "review") {
      dialog.close();
      return;
    }
    reviewState = "complete";
    heading.textContent = "予約体験が完了しました";
    description.textContent = "お選びいただいたKOKU-01の仕様と金額です。";
    edit.hidden = true;
    confirm.querySelector("span").textContent = "シミュレーターに戻る";
    confirm.querySelector("use").setAttribute("href", "#i-arrow");
    heading.focus({preventScroll: true});
  });
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  dialog.addEventListener("close", () => reviewButton.focus({preventScroll: true}));
  window.addEventListener("pageshow", updatePreview);
  updatePreview();
})();
