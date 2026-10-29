
<!DOCTYPE html>
<html lang="rn">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Z-Work Profile</title>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #f5f8f7;
  color: #123b38;
}

.profile-header {
  background: linear-gradient(145deg, #087568, #004e47);
  color: white;
  padding: 22px 18px 24px;
  border-radius: 0 0 30px 30px;
  width: 100%;
}

.back-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 22px;
}

.back-btn, .menu-btn {
  border: 0;
  border-radius: 50%;
  background: #ffffff20;
  color: white;
  font-size: 25px;
  width: 42px;
  height: 42px;
}

.profile-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.profile-text {
  min-width: 0;
  flex: 1;
}

.profile-text h1 {
  font-size: clamp(18px, 5vw, 27px);
  margin: 0 0 9px;
  overflow-wrap: anywhere;
}

.username {
  font-size: 16px;
  color: #bce9df;
  margin-bottom: 10px;
}

.address {
  font-size: 14px;
  margin: 0;
}

.avatar {
  width: 105px;
  height: 105px;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid white;
}

.contact-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 24px;
}

.contact-actions a {
  text-align: center;
  color: white;
  text-decoration: none;
  font-size: 14px;
}

.action-icon {
  width: 54px;
  height: 54px;
  border: 1px solid #ffffff70;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 26px;
  margin: 0 auto 8px;
}

.whatsapp .action-icon {
  background: #16a34a;
  border-color: #16a34a;
}

.share-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 20px;
}

.share-actions button {
  min-height: 54px;
  border: none;
  border-radius: 15px;
  padding: 10px 6px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
}

.share-btn {
  background: #ffffff;
  color: #006b60;
}

.feedback-btn {
  background: #dff4ee;
  color: #005d52;
}

.content {
  padding: 20px 16px;
}

.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.tab {
  background: white;
  border: 1px solid #e0e9e6;
  color: #244744;
  padding: 16px 8px;
  border-radius: 15px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}

.tab.active {
  background: #087568;
  color: white;
  border-color: #087568;
}

.tab-content {
  margin-top: 16px;
  padding: 20px;
  background: white;
  border-radius: 18px;
  min-height: 130px;
  box-shadow: 0 3px 14px #003d3510;
}

.tab-content h2 {
  font-size: 19px;
  margin-top: 0;
}

.hidden {
  display: none;
}

@media (max-width: 360px) {
  .profile-header {
    padding: 16px 12px 20px;
  }

  .avatar {
    width: 82px;
    height: 82px;
  }

  .contact-actions {
    gap: 4px;
  }

  .action-icon {
    width: 47px;
    height: 47px;
  }

  .share-actions button {
    font-size: 12px;
  }
}
</style>
</head>

<body>

<header class="profile-header">

  <div class="back-row">
    <button class="back-btn" onclick="history.back()">←</button>
    <button class="menu-btn"
      onclick="alert('Menu ya profile')">⋮</button>
  </div>

  <div class="profile-info">
    <div class="profile-text">
      <h1>Harerimana yacunne</h1>
      <div class="username">@yacunne001</div>
      <p class="address">📍 3 nahayo road</p>
    </div>

    <img
      class="avatar"
      src="profile.jpg"
      alt="Ifoto ya nyene profile"
    >
  </div>

  <div class="contact-actions">

    <a href="sms:">
      <div class="action-icon">💬</div>
      Message
    </a>

    <a class="whatsapp"
       href="https://wa.me/"
       target="_blank">
      <div class="action-icon">☏</div>
      WhatsApp
    </a>

    <a href="tel:">
      <div class="action-icon">📞</div>
      Call
    </a>

  </div>

  <div class="share-actions">
    <button class="share-btn" onclick="shareProfile()">
      ↗ Sangiza
    </button>

    <button class="feedback-btn"
      onclick="giveFeedback()">
      ✎ Tanga ikitekerezo
    </button>
  </div>

</header>

<main class="content">

  <div class="tabs">
    <button class="tab active"
      onclick="showTab('business', this)">
      🏪 Ubucuruzi
    </button>

    <button class="tab"
      onclick="showTab('jobs', this)">
      💼 Akazi
    </button>
  </div>

  <section id="business" class="tab-content">
    <h2>Ubucuruzi</h2>
    <p>Ubucuruzi bw'uyu muntu buzoboneka hano.</p>
  </section>

  <section id="jobs" class="tab-content hidden">
    <h2>Akazi</h2>
    <p>Amakuru ajanye n'akazi azoboneka hano.</p>
  </section>

</main>

<script>
async function shareProfile() {
  const data = {
    title: "Z-Work Profile",
    text: "Raba profile yanje kuri Z-Work.",
    url: window.location.href
  };

  if (navigator.share) {
    try {
      await navigator.share(data);
    } catch (error) {
      // Uwukoresha ashobora gufunga share menu.
    }
  } else if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(data.url);
      alert("Link ya profile yakoporowe!");
    } catch (error) {
      alert("Koporora link iri muri browser.");
    }
  } else {
    alert("Koporora link iri muri browser.");
  }
}

function giveFeedback() {
  const message = prompt("Andika igitekerezo cawe:");

  if (message && message.trim()) {
    alert("Urakoze ku ciyumviro cawe. Gucibika bisaba backend.");
  }
}

function showTab(id, button) {
  document.querySelectorAll(".tab-content")
    .forEach(section => section.classList.add("hidden"));

  document.getElementById(id).classList.remove("hidden");

  document.querySelectorAll(".tab")
    .forEach(tab => tab.classList.remove("active"));

  button.classList.add("active");
}
</script>

</body>
</html>
