const yesBtn = document.getElementById("yesBtn");
const noBtn = document.getElementById("noBtn");

const questionCard = document.getElementById("questionCard");
const uploadCard = document.getElementById("uploadCard");
const successCard = document.getElementById("successCard");

const uploadForm = document.getElementById("uploadForm");
const photoInput = document.getElementById("photo");
const fileLabel = document.getElementById("fileLabel");

const previewWrap = document.getElementById("previewWrap");
const preview = document.getElementById("preview");

const statusEl = document.getElementById("status");
const sendBtn = document.getElementById("sendBtn");

let noClickCount = 0;

const MIN_NO_SCALE = 0.45;
const MAX_YES_SCALE = 2.2;


// ===============================
// HELPER
// ===============================

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}


// ===============================
// YOX DÜYMƏSİNİN İLK MÖVQEYİ
// ===============================

function placeNoButtonInitial() {
  requestAnimationFrame(() => {
    const rect = noBtn.getBoundingClientRect();

    const x = clamp(
      window.innerWidth / 2 + 70,
      12,
      window.innerWidth - rect.width - 12
    );

    const y = clamp(
      window.innerHeight / 2 + 70,
      12,
      window.innerHeight - rect.height - 12
    );

    noBtn.style.position = "fixed";
    noBtn.style.left = `${x}px`;
    noBtn.style.top = `${y}px`;
    noBtn.style.visibility = "visible";
    noBtn.style.zIndex = "9999";
  });
}


// ===============================
// YOX DÜYMƏSİNİ QAÇIRT
// ===============================

function moveNoButton() {
  const rect = noBtn.getBoundingClientRect();

  const pad = 12;

  const maxX = Math.max(
    pad,
    window.innerWidth - rect.width - pad
  );

  const maxY = Math.max(
    pad,
    window.innerHeight - rect.height - pad
  );

  const oldX = rect.left;
  const oldY = rect.top;

  let x = oldX;
  let y = oldY;

  // Yeni mövqe əvvəlkindən uzaq olsun
  for (let i = 0; i < 40; i++) {
    const candidateX =
      pad +
      Math.random() *
        Math.max(1, maxX - pad);

    const candidateY =
      pad +
      Math.random() *
        Math.max(1, maxY - pad);

    const distance = Math.hypot(
      candidateX - oldX,
      candidateY - oldY
    );

    if (
      distance > 120 ||
      i === 39
    ) {
      x = candidateX;
      y = candidateY;
      break;
    }
  }

  noBtn.style.position = "fixed";

  noBtn.style.left =
    `${clamp(
      x,
      pad,
      maxX
    )}px`;

  noBtn.style.top =
    `${clamp(
      y,
      pad,
      maxY
    )}px`;

  noBtn.style.visibility =
    "visible";

  noBtn.style.zIndex =
    "9999";
}


// ===============================
// DÜYMƏLƏRİN ÖLÇÜSÜNÜ DƏYİŞ
// ===============================

function updateButtonSizes() {
  // YOX kiçilsin
  let noScale =
    1 - noClickCount * 0.10;

  noScale =
    Math.max(
      MIN_NO_SCALE,
      noScale
    );

  noBtn.style.transform =
    `scale(${noScale})`;


  // OLAR böyüsün
  let yesScale =
    1 + noClickCount * 0.12;

  yesScale =
    Math.min(
      MAX_YES_SCALE,
      yesScale
    );

  yesBtn.style.transform =
    `scale(${yesScale})`;
}


// ===============================
// YOX BASILANDA
// ===============================

function handleNoButton(event) {
  event.preventDefault();
  event.stopPropagation();

  noClickCount++;

  updateButtonSizes();

  // Kiçilmədən sonra ölçünün
  // dəyişməsini brauzer tətbiq etsin
  requestAnimationFrame(() => {
    moveNoButton();
  });
}


// Desktop
noBtn.addEventListener(
  "click",
  handleNoButton
);


// Mobil
noBtn.addEventListener(
  "touchend",
  handleNoButton,
  {
    passive: false
  }
);


// ===============================
// OLAR BASILANDA
// ===============================

yesBtn.addEventListener(
  "click",
  () => {

    questionCard.classList.add(
      "hidden"
    );

    // YOX yalnız istifadəçi
    // OLAR seçəndə gizlənir
    noBtn.classList.add(
      "hidden"
    );

    uploadCard.classList.remove(
      "hidden"
    );
  }
);


// ===============================
// ŞƏKİL SEÇİMİ
// ===============================

photoInput.addEventListener(
  "change",
  () => {

    const file =
      photoInput.files?.[0];

    if (!file) {
      fileLabel.textContent =
        "Şəkil seç 📷";

      previewWrap.classList.add(
        "hidden"
      );

      preview.removeAttribute(
        "src"
      );

      return;
    }


    // Fayl ölçüsü
    if (
      file.size >
      10 * 1024 * 1024
    ) {
      statusEl.textContent =
        "Şəkil maksimum 10 MB ola bilər.";

      photoInput.value =
        "";

      return;
    }


    // Fayl tipi
    const fileExtension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase();

    const allowedExtensions =
      [
        "jpg",
        "jpeg",
        "png",
        "webp",
        "gif",
        "heic",
        "heif"
      ];

    const mimeLooksLikeImage =
      file.type.startsWith(
        "image/"
      );

    const extensionAllowed =
      allowedExtensions.includes(
        fileExtension
      );

    if (
      !mimeLooksLikeImage &&
      !extensionAllowed
    ) {
      statusEl.textContent =
        "Yalnız şəkil seçilə bilər.";

      photoInput.value =
        "";

      return;
    }


    fileLabel.textContent =
      file.name;


    // Preview
    const objectUrl =
      URL.createObjectURL(
        file
      );


    preview.src =
      objectUrl;


    previewWrap.classList.remove(
      "hidden"
    );


    statusEl.textContent =
      "";
  }
);


// ===============================
// ŞƏKİL GÖNDƏRMƏ
// ===============================

uploadForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    const file =
      photoInput.files?.[0];


    if (!file) {
      statusEl.textContent =
        "Əvvəl şəkil seç.";

      return;
    }


    const data =
      new FormData();


    data.append(
      "photo",
      file,
      file.name
    );


    sendBtn.disabled =
      true;


    sendBtn.textContent =
      "Göndərilir...";


    statusEl.textContent =
      "";


    try {

      const response =
        await fetch(
          "/api/upload",
          {
            method: "POST",
            body: data
          }
        );


      let result;


      try {
        result =
          await response.json();
      } catch {
        throw new Error(
          `Server cavabı oxunmadı (HTTP ${response.status}).`
        );
      }


      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.message ||
          "Şəkil göndərilmədi."
        );
      }


      uploadCard.classList.add(
        "hidden"
      );


      successCard.classList.remove(
        "hidden"
      );


    } catch (error) {

      statusEl.textContent =
        error.message ||
        "Xəta baş verdi.";

    } finally {

      if (
        !successCard.classList.contains(
          "hidden"
        )
      ) {
        return;
      }


      sendBtn.disabled =
        false;


      sendBtn.textContent =
        "Göndər ❤️";
    }
  }
);


// ===============================
// WINDOW RESIZE
// ===============================

window.addEventListener(
  "resize",
  () => {

    if (
      noBtn.classList.contains(
        "hidden"
      )
    ) {
      return;
    }


    const rect =
      noBtn.getBoundingClientRect();


    const pad =
      12;


    const maxX =
      Math.max(
        pad,
        window.innerWidth -
          rect.width -
          pad
      );


    const maxY =
      Math.max(
        pad,
        window.innerHeight -
          rect.height -
          pad
      );


    const x =
      clamp(
        rect.left,
        pad,
        maxX
      );


    const y =
      clamp(
        rect.top,
        pad,
        maxY
      );


    noBtn.style.left =
      `${x}px`;


    noBtn.style.top =
      `${y}px`;
  }
);


// ===============================
// START
// ===============================

placeNoButtonInitial();
