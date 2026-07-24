const FIREBASE_URL = "https://fighter-club-f5623-default-rtdb.firebaseio.com"; 

let accountsData = [];
let inventoryData = [];
let feedbackData = [];
let galleryData = [];
let directoryData = [];
let activeBirthdayWish = "আজ আমাদের ক্লাবের কোনো মেম্বারের জন্মদিন নেই। 🎉";
let isAdmin = false;
let currentFilter = 'All';

function initDashboard() {
    loadAccounts();
    loadInventory();
    loadFeedback();
    loadGallery();
    loadDirectory();
    loadWeather();
    requestNotificationPermission(); 
    listenToPushNotifications();    
    
    document.getElementById('date').valueAsDate = new Date();
    
    fetch(FIREBASE_URL + "/notice.json").then(res => res.json()).then(text => { if(text) document.getElementById("noticeText").innerText = text; });
    fetch(FIREBASE_URL + "/birthday.json").then(res => res.json()).then(wish => { if(wish) activeBirthdayWish = wish; });
    
    // নিউজ সবার শেষে লোড করা হচ্ছে যেন অন্য ডেটা জ্যাম না করে
   
}
function requestNotificationPermission() {
    if ("Notification" in window) {
        if (Notification.permission === "default") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    console.log("Notification permission granted!");
                }
            });
        }
    }
}

function listenToPushNotifications() {
    setInterval(() => {
        fetch(FIREBASE_URL + "/push_notification.json")
        .then(res => res.json())
        .then(data => {
            if (data && data.text) {
                let lastNotifId = localStorage.getItem("last_fighter_notif_id");
                if (lastNotifId !== data.id) {
                    localStorage.setItem("last_fighter_notif_id", data.id);
                    triggerSystemNotification(data.text);
                }
            }
        }).catch(err => console.log("Notification check failed", err));
    }, 5000);
}

function triggerSystemNotification(message) {
    if ("Notification" in window && Notification.permission === "granted") {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification("🏏 FIGHTER Cricket Club", {
                body: message,
                icon: "fighter-cricket-logo.png",
                badge: "fighter-cricket-logo.png",
                vibrate: [200, 100, 200],
                tag: "fighter-notice"
            });
        });
    } else {
        showFighterNotification("📢 নতুন ঘোষণা: " + message, "info");
    }
}

function sendPushNotification() {
    let msgText = document.getElementById("pushMessage").value;
    if (!msgText) return showFighterNotification("নোটিফিকেশনের টেক্সট লিখুন!", "warning");
    
    let notificationPayload = {
        id: new Date().getTime().toString(), 
        text: msgText
    };

    fetch(FIREBASE_URL + "/push_notification.json", { 
        method: "PUT", 
        body: JSON.stringify(notificationPayload) 
    }).then(() => {
        document.getElementById("pushMessage").value = "";
        showFighterNotification("🚀 সব মেম্বারের ফোনে নোটিফিকেশন চলে গেছে!", "success");
    }).catch(() => {
        showFighterNotification("❌ নোটিফিকেশন পাঠাতে ব্যর্থ হয়েছে।", "error");
    });
}

function showFighterNotification(msg, type = "success") {
    let toast = document.getElementById("fighterToast");
    toast.innerText = msg;
    toast.className = `toast-notification show ${type}`;
    setTimeout(() => { toast.classList.remove("show"); }, 3500);
}

function toggleDark() {
    document.body.classList.toggle("dark");
    showFighterNotification("থিম পরিবর্তন করা হয়েছে!", "success");
}

function handleAuth() {
    if(!isAdmin) {
        let pass = prompt("অ্যাডমিন পাসওয়ার্ড দিন:");
        if(pass === "fighter123") { 
            isAdmin = true;
            document.getElementById("authBtn").innerText = "🔓 Logout";
            document.getElementById("authBtn").className = "btn-danger";
            document.getElementById("adminStatus").innerText = "Admin Mode: আপনি এখন যেকোনো ডাটা পরিবর্তন করতে পারবেন।";
            document.getElementById("adminStatus").classList.add("admin-active");
            document.getElementById("adminForm").style.display = "block";
            document.getElementById("directoryForm").style.display = "block";
            document.getElementById("inventoryForm").style.display = "block";
            document.getElementById("galleryForm").style.display = "block";
            document.getElementById("noticeForm").style.display = "block";
            showFighterNotification("অ্যাডমিন লগইন সফল হয়েছে!", "success");
            render(); renderDirectory(); renderGallery(); renderInventory(); loadFeedback();
        } else {
            showFighterNotification("ভুল পাসওয়ার্ড!", "error");
        }
    } else {
        isAdmin = false;
        document.getElementById("authBtn").innerText = "🔐 Admin Login";
        document.getElementById("authBtn").className = "btn-success";
        document.getElementById("adminStatus").innerText = "View Mode: আপনি এখন হিসাব শুধু দেখতে পারবেন।";
        document.getElementById("adminStatus").classList.remove("admin-active");
        document.getElementById("adminForm").style.display = "none";
        document.getElementById("directoryForm").style.display = "none";
        document.getElementById("inventoryForm").style.display = "none";
        document.getElementById("galleryForm").style.display = "none";
        document.getElementById("noticeForm").style.display = "none";
        document.getElementById("newsForm").style.display = "none";
        showFighterNotification("লগআউট সফল হয়েছে।", "warning");
        render(); renderDirectory(); renderGallery(); renderInventory(); loadFeedback();
    }
}

function loadAccounts() {
    fetch(FIREBASE_URL + "/accounts.json").then(res => res.json()).then(serverData => {
        accountsData = [];
        if(serverData) { Object.keys(serverData).forEach(key => { accountsData.push({ id: key, ...serverData[key] }); }); }
        render();
    });
}

function render() {
    let list = document.getElementById("list");
    list.innerHTML = "";
    let search = document.getElementById("search").value.toLowerCase();
    
    let totalIncome = 0;
    let totalExpense = 0;
    
    accountsData.forEach(acc => {
        if(acc.type === "income") totalIncome += Number(acc.paid || 0);
        if(acc.type === "expense") totalExpense += Number(acc.price || 0);
        
        if(acc.member.toLowerCase().includes(search) || acc.item.toLowerCase().includes(search)) {
            let due = Number(acc.price) - Number(acc.paid);
            list.innerHTML += `
                <tr>
                    <td style="color:#3b82f6; font-weight:600; cursor:pointer;" onclick="openMemberModal('${acc.member}')">👤 ${acc.member}</td>
                    <td>${acc.item}</td>
                    <td><span style="color:${acc.type==='income'?'#10b981':'#ef4444'}; font-weight:bold;">${acc.type==='income'?'জমা (In)':'খরচ (Out)'}</span></td>
                    <td>${acc.date}</td>
                    <td style="font-weight:600;">${acc.price} ৳</td>
                    <td style="color:#10b981; font-weight:600;">${acc.paid} ৳</td>
                    <td style="color:${due>0?'#ef4444':'#10b981'}; font-weight:bold;">${due} ৳</td>
                    ${isAdmin ? `<td><button class="btn-danger" style="padding:6px 12px; font-size:12px; border-radius:8px;" onclick="delAccount('${acc.id}')">Delete</button></td>` : ''}
                </tr>`;
        }
    });
    
    document.getElementById("totalMoney").innerText = totalIncome + " ৳";
    document.getElementById("totalExpense").innerText = totalExpense + " ৳";
    document.getElementById("liveVault").innerText = (totalIncome - totalExpense) + " ৳";
}

function addAccount() {
    let member = document.getElementById("member").value;
    let item = document.getElementById("item").value;
    let type = document.getElementById("type").value;
    let price = Number(document.getElementById("price").value);
    let paid = Number(document.getElementById("paid").value);
    let date = document.getElementById("date").value;
    
    if(!member || !item || !price || !date) return showFighterNotification("সব তথ্য দিন!", "warning");
    
    let newData = { member, item, type, price, paid, date };
    fetch(FIREBASE_URL + "/accounts.json", { method: "POST", body: JSON.stringify(newData) }).then(() => {
        loadAccounts();
        document.getElementById("member").value = ""; document.getElementById("item").value = "";
        document.getElementById("price").value = ""; document.getElementById("paid").value = "";
        showFighterNotification("হিসাব লাইভ ডেটাবেজে যুক্ত হয়েছে!", "success");
    });
}

function delAccount(id) {
    if(confirm("হিসাবটি ডিলিট করতে চান?")) {
        fetch(`${FIREBASE_URL}/accounts/${id}.json`, { method: "DELETE" }).then(() => { 
            loadAccounts();
            showFighterNotification("হিসাবটি ডিলিট করা হয়েছে।", "warning");
        });
    }
}

function loadDirectory() {
    fetch(FIREBASE_URL + "/directory.json")
    .then(res => res.json())
    .then(serverData => {
        directoryData = [];
        if(serverData) { 
            Object.keys(serverData).forEach(key => { 
                directoryData.push({ id: key, ...serverData[key] }); 
            }); 
        }
        
        // হোমপেজে বা ড্যাশবোর্ডে মোট সদস্য সংখ্যা আপডেট করা
        let totalBox = document.getElementById("totalMembers");
        if(totalBox) {
            totalBox.innerText = directoryData.length + " জন";
        }
        
        // মেম্বারদের লিস্ট স্ক্রিনে দেখানো
        renderDirectory();
        // মেম্বার লিস্ট লোড হওয়ার পর স্বয়ংক্রিয়ভাবে চেক করবে কোনো পপআপ ছাড়াই
setTimeout(checkTodayBirthdaysSilent, 2000); 

function checkTodayBirthdaysSilent() {
    let today = new Date();
    let todayDay = today.getDate();
    let todayMonth = today.getMonth() + 1;
    let birthdayBoys = [];

    directoryData.forEach(member => {
        if (member.dob) {
            let memberBirthDate = new Date(member.dob);
            if (todayDay === memberBirthDate.getDate() && todayMonth === (memberBirthDate.getMonth() + 1)) {
                birthdayBoys.push(member.name);
            }
        }
    });

    if (birthdayBoys.length > 0) {
        let noticeText = document.getElementById("noticeText");
        if(noticeText) {
            noticeText.innerText = `🎂 জন্মদিনের শুভেচ্ছা! আজ ফাইটার ক্লাবের সদস্য ${birthdayBoys.join(", ")} এর জন্মদিন! 🎉`;
        }
    }
}
    })
    .catch(err => console.error("Error loading directory:", err));
}
function addDirectory() {
    let name = document.getElementById("dirName").value;
    let phone = document.getElementById("dirPhone").value;
    let blood = document.getElementById("dirBlood").value;
    let dob = document.getElementById("dirDOB").value; // নতুন ইনপুট
    let fileInput = document.getElementById("dirFile").files[0];
    
    if(!name || !phone || !dob) return showFighterNotification("নাম, ফোন ও জন্মতারিখ দিন!", "warning");

    if (fileInput) {
        let reader = new FileReader();
        reader.onload = function(e) {
            let base64Img = e.target.result;
            saveDirectoryToFirebase(name, phone, base64Img, blood, dob);
        };
        reader.readAsDataURL(fileInput);
    } else {
        saveDirectoryToFirebase(name, phone, "https://cdn-icons-png.flaticon.com/512/149/149071.png", blood, dob);
    }
}
function saveDirectoryToFirebase(name, phone, imgData, blood, dob) {
    fetch(FIREBASE_URL + "/directory.json", { 
        method: "POST", 
        body: JSON.stringify({ name, phone, img: imgData, blood, dob }) 
    })
    .then(res => res.json())
    .then(() => {
        document.getElementById("dirName").value = ""; 
        document.getElementById("dirPhone").value = "";
        document.getElementById("dirDOB").value = "";
        document.getElementById("dirFile").value = "";
        
        showFighterNotification("মেম্বার প্রোফাইল তৈরি হয়েছে!", "success");
        loadDirectory(); 
    })
    .catch(err => {
        showFighterNotification("ডাটা সেভ করতে সমস্যা হয়েছে!", "error");
    });
}
function delDirectory(id) {
    if(confirm("ডিরেক্টরি থেকে এই মেম্বার সнять চান?")) {
        fetch(`${FIREBASE_URL}/directory/${id}.json`, { method: "DELETE" }).then(() => { 
            loadDirectory(); 
            showFighterNotification("মেম্বার প্রোফাইল রিমুভ করা হয়েছে।", "warning");
        });
    }
}

function renderDirectory() {
    let container = document.getElementById("directoryCardContainer"); container.innerHTML = "";
    directoryData.forEach(d => {
        container.innerHTML += `
            <div class="member-card">
                <img src="${d.img}" class="avatar" onerror="this.src='https://cdn-icons-png.flaticon.com/512/149/149071.png'">
                <h4>${d.name}</h4>
                <a class="phone" href="javascript:void(0)" onclick="showPhone('${d.phone}')">📞 ফোন নম্বর দেখুন</a>
                <span class="blood-badge">🩸 Group: ${d.blood}</span>
                ${isAdmin ? `<br><button class="btn-danger" style="padding:6px 12px; font-size:11px; margin-top:18px; width:100%; justify-content:center; border-radius:8px;" onclick="delDirectory('${d.id}')">Delete Profile</button>` : ''}
            </div>`;
    });
}

function loadInventory() {
    fetch(FIREBASE_URL + "/inventory.json").then(res => res.json()).then(serverData => {
        inventoryData = []; if(serverData) { Object.keys(serverData).forEach(key => { inventoryData.push({ id: key, ...serverData[key] }); }); }
        renderInventory();
    });
}
function addInventory() {
    let item = document.getElementById("invItem").value; let qty = document.getElementById("invQty").value; let status = document.getElementById("invStatus").value;
    if(!item || !qty) return showFighterNotification("সব তথ্য দিন!", "warning");
    fetch(FIREBASE_URL + "/inventory.json", { method: "POST", body: JSON.stringify({item, qty, status}) }).then(() => { 
        loadInventory();
        document.getElementById("invItem").value = ""; document.getElementById("invQty").value = "";
        showFighterNotification("ইনভেন্টরি আপডেট হয়েছে!", "success");
    });
}
function delInventory(id) {
    if(confirm("ইনভেন্টরি থেকে ডিলিট করতে চান?")) {
        fetch(`${FIREBASE_URL}/inventory/${id}.json`, { method: "DELETE" }).then(() => { 
            loadInventory(); 
            showFighterNotification("আইটেম ডিলিট করা হয়েছে।", "warning");
        });
    }
}
function renderInventory(){
    let invList = document.getElementById("inventoryList"); invList.innerHTML = "";
    inventoryData.forEach((d) => {
        invList.innerHTML += `
        <tr>
            <td><strong>🏏 ${d.item}</strong></td>
            <td style="font-weight:600;">${d.qty} টি</td>
            <td><span style="background:${d.status==='নষ্ট'?'rgba(239,68,68,0.15)':'rgba(16,185,129,0.15)'}; color:${d.status==='নষ্ট'?'#ef4444':'#10b981'}; padding:4px 12px; border-radius:50px; font-size:12px; font-weight:bold;">${d.status}</span></td>
            ${isAdmin ? `<td><button class="btn-danger" style="padding:6px 12px; font-size:12px; border-radius:8px;" onclick="delInventory('${d.id}')">Delete</button></td>` : ''}
        </tr>`;
    });
}

function loadGallery() {
    fetch(FIREBASE_URL + "/gallery.json").then(res => res.json()).then(serverData => {
        galleryData = [];
        if(serverData) { Object.keys(serverData).forEach(key => { galleryData.push({ id: key, ...serverData[key] }); }); }
        renderGallery();
    });
}

function uploadPhoto() {
    let fileInput = document.getElementById("galFile").files[0];
    let caption = document.getElementById("galCaption").value;
    let album = document.getElementById("galAlbum").value;
    
    if(!fileInput || !caption) return showFighterNotification("ছবি এবং ক্যাপশন দুটোই দিন!", "warning");
    
    let reader = new FileReader();
    reader.onload = function(e) {
        let base64Img = e.target.result;
        fetch(FIREBASE_URL + "/gallery.json", { method: "POST", body: JSON.stringify({ url: base64Img, caption, album }) }).then(() => {
            loadGallery();
            document.getElementById("galFile").value = ""; document.getElementById("galCaption").value = "";
            showFighterNotification("গ্যালারিতে ইমেজ পোস্ট সফল হয়েছে!", "success");
        });
    };
    reader.readAsDataURL(fileInput);
}

// পুরাতন delPhoto ফাংশনটি বদলে এটি দিন:
function delPhoto(id) {
    if(window.event) { window.event.stopPropagation(); }
    if(confirm("ছবিটি মুছে ফেলতে চান?")) {
        fetch(`${FIREBASE_URL}/gallery/${id}.json`, { method: "DELETE" }).then(() => { 
            loadGallery(); 
            showFighterNotification("ছবিটি মুছে ফেলা হয়েছে।", "warning");
        });
    }
}

// পুরাতন filterGallery ফাংশনটি বদলে এটি দিন:
function filterGallery(albumName) {
    currentFilter = albumName;
    let btns = document.querySelectorAll('.filter-btn');
    btns.forEach(btn => btn.classList.remove('active'));
    if(window.event && window.event.target) { window.event.target.classList.add('active'); }
    renderGallery();
}

function renderGallery() {
    // গ্যালারির সঠিক HTML আইডি directoryCardContainer অথবা আপনার গ্যালারি গ্রিডের আইডি দিন
    let container = document.getElementById("directoryCardContainer"); 
    if(!container) return;
    container.innerHTML = "";
    
    galleryData.forEach(item => {
        let card = document.createElement("div");
        card.className = "gallery-card";
        card.innerHTML = `
            <img src="${item.img || 'https://via.placeholder.com/150'}" alt="Gallery Image">
            <div class="gallery-info">
                <h4>${item.title || 'গ্যালারি ছবি'}</h4>
                <button onclick="deleteGallery('${item.id}')" style="background:red; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; margin-top:5px;">ডিলিট</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function openLightbox(url, caption) {
    document.getElementById("lightboxImg").src = url;
    document.getElementById("lightboxCaption").innerText = caption;
    document.getElementById("lightbox").style.display = "flex";
}
function closeLightbox() { document.getElementById("lightbox").style.display = "none"; }

function loadFeedback() {
    fetch(FIREBASE_URL + "/feedback.json").then(res => res.json()).then(serverData => {
        feedbackData = []; 
        if(serverData) { Object.keys(serverData).forEach(key => { feedbackData.push({ id: key, ...serverData[key] }); }); }
        renderFeedback();
    });
}

function sendFeedback() {
    let name = document.getElementById("fbName").value;
    let msg = document.getElementById("fbMsg").value;
    if(!name || !msg) return showFighterNotification("নাম ও মেসেজ দুটোই লিখুন!", "warning");
    
    fetch(FIREBASE_URL + "/feedback.json", { method: "POST", body: JSON.stringify({name, msg}) }).then(() => {
        loadFeedback();
        document.getElementById("fbName").value = ""; document.getElementById("fbMsg").value = "";
        showFighterNotification("পরামর্শ বোর্ড সাবমিট সফল!", "success");
    });
}

function delFeedback(id) {
    if(confirm("পরামর্শটি মুছে ফেলতে চান?")) {
        fetch(`${FIREBASE_URL}/feedback/${id}.json`, { method: "DELETE" }).then(() => { 
            loadFeedback(); 
            showFighterNotification("বার্তা মুছে ফেলা হয়েছে।", "warning");
        });
    }
}

function renderFeedback() {
    let fbList = document.getElementById("feedbackList"); 
    fbList.innerHTML = "";
    if(feedbackData.length === 0) {
        fbList.innerHTML = "<p style='color:var(--text-muted); font-size:14px;'>এখনো কোনো পরামর্শ নেই।</p>";
        return;
    }
    feedbackData.forEach(f => {
        fbList.innerHTML += `
            <div class="msg-box">
                <div><strong>👤 ${f.name}:</strong> <span style="color: #cbd5e1; margin-left: 6px;">${f.msg}</span></div>
                ${isAdmin ? `<button class="btn-danger" style="padding:4px 10px; font-size:11px; border-radius:6px;" onclick="delFeedback('${f.id}')">Delete</button>` : ''}
            </div>`;
    });
}

function updateNotice() {
    let text = document.getElementById("newNotice").value;
    if(!text) return;
    fetch(FIREBASE_URL + "/notice.json", { method: "PUT", body: JSON.stringify(text) }).then(() => {
        document.getElementById("noticeText").innerText = text;
        document.getElementById("newNotice").value = "";
        showFighterNotification("লাইভ নোটিশ আপডেট হয়েছে!", "success");
    });
}

function updateBirthdayWish() {
    let wish = document.getElementById("newBirthdayWish").value;
    if(!wish) return;
    fetch(FIREBASE_URL + "/birthday.json", { method: "PUT", body: JSON.stringify(wish) }).then(() => {
        activeBirthdayWish = wish;
        document.getElementById("newBirthdayWish").value = "";
        showFighterNotification("বার্থডে উইশ মেমোরি আপডেট সফল!", "success");
    });
}

function checkTodayBirthdays() {
    alert(`🎂 আজকের উইশ বার্তা: \n\n${activeBirthdayWish}`);
}

function openMemberModal(memberName) {
    document.getElementById("modalMemberName").innerText = `👤 ${memberName} - এর ব্যক্তিগত হিসাব`;
    let tableBody = document.getElementById("modalTableBody");
    tableBody.innerHTML = "";
    
    let totalPaid = 0;
    let totalDue = 0;
    
    accountsData.forEach(acc => {
        if(acc.member.toLowerCase() === memberName.toLowerCase()) {
            let due = Number(acc.price) - Number(acc.paid);
            totalPaid += Number(acc.paid);
            totalDue += due;
            
            tableBody.innerHTML += `
                <tr>
                    <td>${acc.item}</td>
                    <td>${acc.date}</td>
                    <td style="color:#10b981;">${acc.paid} ৳</td>
                    <td style="color:${due>0?'#ef4444':'#10b981'}; font-weight:bold;">${due} ৳</td>
                </tr>`;
        }
    });
    
    document.getElementById("modalTotalPaid").innerText = totalPaid;
    document.getElementById("modalTotalDue").innerText = totalDue;
    document.getElementById("memberModal").style.display = "flex";
}
function closeModal() { document.getElementById("memberModal").style.display = "none"; }

function loadWeather() {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=25.3289&longitude=89.5395&current=temperature_2m,relative_humidity_2m")
    .then(res => res.json())
    .then(data => {
        if(data && data.current) {
            let temp = data.current.temperature_2m;
            let humidity = data.current.relative_humidity_2m;
            document.getElementById("weatherDisplay").innerText = `☀️ তাপমাত্রা: ${temp}°C | 💧 আর্দ্রতা: ${humidity}% | ক্রিকেট খেলার জন্য আবহাওয়া চমৎকার! 🏏`;
        }
    }).catch(() => {
        document.getElementById("weatherDisplay").innerText = "☀️ তাপমাত্রা: ২৯°C | ক্রিকেট খেলার জন্য আবহাওয়া একদম অনুকূল!";
    });
}

function toggleCalculator() {
    let calc = document.getElementById("calculatorWidget");
    calc.style.display = (calc.style.display === "block") ? "none" : "block";
}
function p(val) { document.getElementById("display").value += val; }
function clearCalc() { document.getElementById("display").value = ""; }
function calc() {
    try {
        let result = eval(document.getElementById("display").value);
        document.getElementById("display").value = result;
    } catch(err) {
        document.getElementById("display").value = "Error";
    }
}

const PHONE_PASSWORD = "fightermember2026";

function showPhone(phone) {
    const pass = prompt("📞 ফোন নম্বর দেখতে পাসওয়ার্ড দিন:");
    if (pass === null) return;
    if (pass === PHONE_PASSWORD) {
        alert("📞 ফোন নম্বর: " + phone);
    } else {
        showFighterNotification("❌ ভুল পাসওয়ার্ড!", "error");
    }
}

if ("serviceWorker" in navigator) {
navigator.serviceWorker.register("sw.js")
.then(reg => {
console.log("Service Worker Registered");
reg.addEventListener("updatefound",()=>{
const newWorker=reg.installing;
newWorker.addEventListener("statechange",()=>{
if(newWorker.state==="installed" && navigator.serviceWorker.controller){
document.getElementById("updatePopup").style.display="flex";
}
});
});
document.getElementById("updateNow").onclick=function(){
if(reg.waiting){
reg.waiting.postMessage({
type:"SKIP_WAITING"
});
}
location.reload();
};
})
.catch(err=>console.log(err));
}
window.addEventListener("scroll", () => {
const winScroll=document.documentElement.scrollTop;
const height=document.documentElement.scrollHeight-document.documentElement.clientHeight;
const scrolled=(winScroll/height)*100;
document.getElementById("progressBar").style.width=scrolled+"%";
});
function scrollToTop(){
window.scrollTo({
top:0,
behavior:"smooth"
});
}
function toggleSettings(){
document
.getElementById("settingsPanel")
.classList.toggle("active");
}

function changeTheme(color){
document.documentElement
.style.setProperty("--primary",color);
showFighterNotification(
"Theme Changed!",
"success"
);
}
function closeWelcome(){
document
.getElementById("welcomePopup")
.style.display="none";
}
function toggleAI(){
const box=document.getElementById("aiBox");
box.style.display=
box.style.display==="block"
?"none":"block";
}

function askAI(type){
let answer="";
switch(type){
case "members":
answer="👥 বর্তমানে ক্লাবের Member তালিকা Member Directory-তে দেখতে পারবেন।";
break;
case "notice":
answer="📢 সর্বশেষ Notice দেখতে Notice Board খুলুন।";
break;
case "weather":
answer="🌦 আজকের আবহাওয়া Dashboard-এর Weather Card-এ দেখানো হচ্ছে।";
break;
case "about":
answer="🏏 FIGHTER Cricket Club একটি আধুনিক ক্রিকেট ক্লাব ম্যানেজমেন্ট প্ল্যাটফর্ম।";
break;
}
document.getElementById("aiMessages").innerHTML+=`
<div class="ai-msg">${answer}</div>
`;
document.getElementById("aiMessages").scrollTop=
document.getElementById("aiMessages").scrollHeight;
}
let newWorker;

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
    .then(reg => {
        reg.addEventListener('updatefound', () => {
            newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
                if (
                    newWorker.state === 'installed' &&
                    navigator.serviceWorker.controller
                ) {
                    document
                    .getElementById('updatePopup')
                    .style.display = 'flex';
                }
            });
        });
    });
}

function updateApp(){
    if(newWorker){
        newWorker.postMessage({
            action:'skipWaiting'
        });
    }
    location.reload();
}

function closeUpdatePopup(){
    document
    .getElementById('updatePopup')
    .style.display='none';
}
/* ===== Hero Banner Slider ===== */

const slides = document.querySelectorAll(".hero-slide");
const dots = document.querySelectorAll(".hero-dots span");

let currentSlide = 0;

setInterval(() => {

slides[currentSlide].classList.remove("active");
dots[currentSlide].classList.remove("active");

currentSlide++;

if(currentSlide >= slides.length){
currentSlide = 0;
}

slides[currentSlide].classList.add("active");
dots[currentSlide].classList.add("active");

},5000);
let notifications = [

{
title:"📢 Match Update",
message:"FIGHTER vs Warriors আগামীকাল বিকাল ৩:৩০",
time:"Today"
},

{
title:"🎂 Birthday",
message:"আজ রাহিমের জন্মদিন 🎉",
time:"Today"
},

{
title:"📢 Admin Message",
message:"শুক্রবার সকাল ৮টায় প্র্যাকটিস",
time:"2 Hours Ago"
},

{
title:"🏆 Tournament",
message:"Registration Started",
time:"Yesterday"
},

{
title:"💰 Payment Reminder",
message:"আপনার ২০০ টাকা বাকি আছে।",
time:"Yesterday"
}

];

function loadNotifications(){

const box=document.getElementById("notificationList");

box.innerHTML="";

notifications.forEach(n=>{

box.innerHTML+=`

<div class="notification-item">

<div class="notification-title">${n.title}</div>

<div>${n.message}</div>

<div class="notification-time">${n.time}</div>

</div>

`;

});

document.getElementById("notificationCount").innerText=notifications.length;

}

function toggleNotifications(){

let panel=document.getElementById("notificationPanel");

panel.style.display=panel.style.display==="block"?"none":"block";

}

function clearNotifications(){

notifications=[];

loadNotifications();

}

window.addEventListener("load",loadNotifications);
// ডিরেক্টরি লোড হওয়ার পর স্বয়ংক্রিয়ভাবে জন্মদিন চেক হবে
function checkTodayBirthdays() {
    if (directoryData.length === 0) {
        alert("🎂 ডিরেক্টরি ডাটা লোড হচ্ছে, অনুগ্রহ করে একটু অপেক্ষা করুন।");
        return;
    }

    let today = new Date();
    let todayDay = today.getDate();
    let todayMonth = today.getMonth() + 1; // JavaScript-এ মাস ০ থেকে শুরু হয়

    let birthdayBoys = [];

    directoryData.forEach(member => {
        if (member.dob) {
            let memberBirthDate = new Date(member.dob);
            let birthDay = memberBirthDate.getDate();
            let birthMonth = memberBirthDate.getMonth() + 1;

            // যদি আজকের দিন এবং মাস মেম্বারের জন্মদিনের দিন ও মাসের সাথে মিলে যায়
            if (todayDay === birthDay && todayMonth === birthMonth) {
                birthdayBoys.push(member.name);
            }
        }
    });

    if (birthdayBoys.length > 0) {
        let names = birthdayBoys.join(", ");
        alert(`🎂 শুভ জন্মদিন! 🎉\n\nআজ আমাদের ফাইটার ক্লাবের প্রিয় সদস্য [ ${names} ] এর জন্মদিন। সবাই তাকে শুভেচ্ছা জানান! 🥳✨`);
    } else {
        alert("🎂 আজ আমাদের ক্লাবের কোনো মেম্বারের জন্মদিন নেই। 🎉");
    }
}
function updateClock(){

const now=new Date();

document.getElementById("clock").innerHTML=

now.toLocaleTimeString();

}

setInterval(updateClock,1000);

updateClock();
window.addEventListener("scroll",()=>{

const reveals=document.querySelectorAll(".reveal");

reveals.forEach(el=>{

const top=el.getBoundingClientRect().top;

const windowHeight=window.innerHeight;

if(top<windowHeight-120){

el.classList.add("active");

}

});

});
/* ===========================
   Premium Mouse Trail
=========================== */

if(window.matchMedia("(pointer:fine)").matches){

document.addEventListener("mousemove",function(e){

const trail=document.createElement("div");

trail.className="mouse-trail";

trail.style.left=e.clientX+"px";
trail.style.top=e.clientY+"px";

document.body.appendChild(trail);

setTimeout(()=>{
trail.remove();
},700);

});

}
const matchRef = ref(
database,
"match-center/football/match1"
);


onValue(matchRef,(snapshot)=>{


const data=snapshot.val();


if(data){


document.getElementById("homeTeam").innerHTML=
data.homeTeam;


document.getElementById("awayTeam").innerHTML=
data.awayTeam;


document.getElementById("homeScore").innerHTML=
data.homeScore;


document.getElementById("awayScore").innerHTML=
data.awayScore;


document.getElementById("matchStatus").innerHTML=
data.status;


document.getElementById("matchTime").innerHTML=
data.time;


document.getElementById("homeLogo").src=
data.homeLogo;


document.getElementById("awayLogo").src=
data.awayLogo;


document.getElementById("stadium").innerHTML=
data.stadium;


document.getElementById("referee").innerHTML=
data.referee;



let goals="";

data.goals?.forEach(g=>{

goals+=`<li>⚽ ${g}</li>`;

});


document.getElementById("goalsList").innerHTML=goals;



let yellow="";

data.yellowCards?.forEach(y=>{

yellow+=`<li>🟨 ${y}</li>`;

});


document.getElementById("yellowList").innerHTML=yellow;



let red="";

data.redCards?.forEach(r=>{

red+=`<li>🟥 ${r}</li>`;

});


document.getElementById("redList").innerHTML=red;


}


});

 type="application/ld+json">
{
 "@context":"https://schema.org",
 "@type":"SportsOrganization",
 "name":"FIGHTER Cricket Club",
 "url":"https://fighter-bd.github.io/fighter-website/",
 "logo":"https://fighter-bd.github.io/fighter-website/fighter-cricket-logo.png"
}
function toggleMenu(){

document
.querySelector(".nav-links")
.classList.toggle("active");

}

document.querySelectorAll(".nav-links a").forEach(link=>{

link.onclick=()=>{

document
.querySelector(".nav-links")
.classList.remove("active");

}

});
window.addEventListener("scroll",()=>{

const nav=document.querySelector(".navbar");

if(window.scrollY>30){

nav.classList.add("scrolled");

}else{

nav.classList.remove("scrolled");

}

});
// Premium Mouse 3D Effect

document.querySelectorAll(".pro-card,.box,.member-card,.gallery-item").forEach(card=>{

card.addEventListener("mousemove",(e)=>{

const rect=card.getBoundingClientRect();

const x=e.clientX-rect.left;

const y=e.clientY-rect.top;

const rotateY=((x/rect.width)-0.5)*14;

const rotateX=((rect.height/2-y)/rect.height)*14;

card.style.transform=`
perspective(1000px)
rotateX(${rotateX}deg)
rotateY(${rotateY}deg)
translateY(-10px)
`;

});

card.addEventListener("mouseleave",()=>{

card.style.transform="perspective(1000px) rotateX(0deg) rotateY(0deg)";

});

});
// Scroll Reveal

const reveals=document.querySelectorAll(
".pro-card,.box,.member-card,.gallery-item,.weather-widget,.notice-board"
);

reveals.forEach(el=>{
el.classList.add("reveal");
});

function revealOnScroll(){

reveals.forEach(el=>{

const top=el.getBoundingClientRect().top;

const visible=window.innerHeight-80;

if(top<visible){

el.classList.add("active");

}

});

}

window.addEventListener("scroll",revealOnScroll);

revealOnScroll();
// Cursor Glow

const glow=document.querySelector(".cursor-glow");

document.addEventListener("mousemove",(e)=>{

glow.style.left=e.clientX+"px";

glow.style.top=e.clientY+"px";

});