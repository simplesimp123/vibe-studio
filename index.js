// Initialize Lucide Icons
lucide.createIcons();

/* ==========================================================================
   PREMIUM CURSOR SYSTEM
   ========================================================================== */
const cursorRing = document.querySelector('.cursor-ring');
const cursorDot  = document.querySelector('.cursor-dot');
const cursorGlow = document.querySelector('.cursor-glow');
const trailCanvas = document.getElementById('cursor-trail-canvas');
const trailCtx   = trailCanvas.getContext('2d');

// Canvas sizing
function resizeTrailCanvas() {
    trailCanvas.width  = window.innerWidth;
    trailCanvas.height = window.innerHeight;
}
resizeTrailCanvas();
window.addEventListener('resize', resizeTrailCanvas);

// Tracking positions
let mouseX = 0, mouseY = 0;
let ringX  = 0, ringY  = 0;
let glowX  = 0, glowY  = 0;

// Trail particle pool
const particles = [];
const MAX_PARTICLES = 35;

class TrailParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 3 + 1.5;
        this.life = 1.0;          // 1 → 0
        this.decay = Math.random() * 0.025 + 0.015;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        // Pick between mint and blue
        this.color = Math.random() > 0.5
            ? [0, 245, 212]    // mint
            : [0, 180, 216];   // blue
    }
    update() {
        this.life -= this.decay;
        this.x += this.vx;
        this.y += this.vy;
        this.size *= 0.98;
    }
    draw(ctx) {
        const [r, g, b] = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${this.life * 0.45})`;
        ctx.fill();
        // Glow layer
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${this.life * 0.08})`;
        ctx.fill();
    }
}

// Mouse tracking
let lastEmitX = 0, lastEmitY = 0;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // Position dot instantly (zero latency feel)
    cursorDot.style.left = mouseX + 'px';
    cursorDot.style.top  = mouseY + 'px';
    
    // Emit trail particles when cursor moves enough distance
    const dist = Math.hypot(mouseX - lastEmitX, mouseY - lastEmitY);
    if (dist > 6) {
        if (particles.length < MAX_PARTICLES) {
            particles.push(new TrailParticle(mouseX, mouseY));
        }
        lastEmitX = mouseX;
        lastEmitY = mouseY;
    }
});

// Click ripple effect
document.addEventListener('click', (e) => {
    const ripple = document.createElement('div');
    ripple.className = 'click-ripple';
    ripple.style.left = e.clientX + 'px';
    ripple.style.top  = e.clientY + 'px';
    document.body.appendChild(ripple);
    
    // Spawn a burst of particles on click
    for (let i = 0; i < 8; i++) {
        const p = new TrailParticle(e.clientX, e.clientY);
        p.vx = (Math.random() - 0.5) * 3;
        p.vy = (Math.random() - 0.5) * 3;
        p.size = Math.random() * 3 + 2;
        p.decay = 0.03;
        particles.push(p);
    }
    
    ripple.addEventListener('animationend', () => ripple.remove());
});

// Main animation loop — ring/glow lerp + trail rendering
function animateCursor() {
    // Lerp ring (0.12 = smooth follow)
    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;
    cursorRing.style.left = ringX + 'px';
    cursorRing.style.top  = ringY + 'px';
    
    // Lerp glow (even slower = dreamy lag)
    glowX += (mouseX - glowX) * 0.06;
    glowY += (mouseY - glowY) * 0.06;
    cursorGlow.style.left = glowX + 'px';
    cursorGlow.style.top  = glowY + 'px';
    
    // Draw trail particles
    trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(trailCtx);
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }
    
    requestAnimationFrame(animateCursor);
}
animateCursor();

// Hover interactions — interactive elements
const interactiveElements = document.querySelectorAll('a, button, .calc-chip, input, textarea, select, .checkbox-item, .copy-btn, .open-modal');
interactiveElements.forEach(el => {
    el.addEventListener('mouseenter', () => {
        document.body.classList.add('hover-interactive');
    });
    el.addEventListener('mouseleave', () => {
        document.body.classList.remove('hover-interactive');
    });
});

// Magnetic snap — buttons pull cursor slightly toward their center
document.querySelectorAll('.btn, .glass-btn, .filter-btn, .calc-chip').forEach(el => {
    el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const pullStrength = 0.25;
        
        const magnetX = mouseX + (cx - mouseX) * pullStrength;
        const magnetY = mouseY + (cy - mouseY) * pullStrength;
        
        cursorDot.style.left = magnetX + 'px';
        cursorDot.style.top  = magnetY + 'px';
    });
    
    el.addEventListener('mouseleave', () => {
        cursorDot.style.left = mouseX + 'px';
        cursorDot.style.top  = mouseY + 'px';
    });
});

/* ==========================================================================
   3D TILT EFFECT (Inertial Card Interactions)
   ========================================================================== */
const tiltCards = document.querySelectorAll('.tilt-card');
tiltCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left; // x coordinate inside the card
        const y = e.clientY - rect.top; // y coordinate inside the card
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Calculate tilt rotations (max 10 degrees)
        const rotateX = ((centerY - y) / centerY) * 10;
        const rotateY = ((x - centerX) / centerX) * 10;
        
        card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    
    card.addEventListener('mouseleave', () => {
        // Reset transform smoothly
        card.style.transform = 'rotateX(0deg) rotateY(0deg)';
    });
});

/* ==========================================================================
   MOBILE MENU TOGGLE
   ========================================================================== */
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const mobileNav = document.querySelector('.mobile-nav');

if (mobileMenuToggle && mobileNav) {
    mobileMenuToggle.addEventListener('click', () => {
        mobileNav.classList.toggle('active');
        const icon = mobileMenuToggle.querySelector('i');
        if (mobileNav.classList.contains('active')) {
            icon.setAttribute('data-lucide', 'x');
        } else {
            icon.setAttribute('data-lucide', 'menu');
        }
        lucide.createIcons();
    });

    // Close mobile menu on clicking any navigation link
    mobileNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileNav.classList.remove('active');
            mobileMenuToggle.querySelector('i').setAttribute('data-lucide', 'menu');
            lucide.createIcons();
        });
    });
}

/* ==========================================================================
   SCROLL REVEAL & RADAR BAR ANIMATIONS
   ========================================================================== */
const reveals = document.querySelectorAll('.scroll-reveal');
const radarSection = document.querySelector('.skills-container');

const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            
            // If the element is the skills container, trigger progress bar animations
            if (entry.target.classList.contains('skills-container')) {
                const radarCard = entry.target.querySelector('.radar-card');
                if (radarCard) {
                    radarCard.classList.add('animated');
                }
            }
            observer.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.15
});

reveals.forEach(reveal => {
    revealObserver.observe(reveal);
});

// Also observe the stats to count up
const stats = document.querySelectorAll('.stat-num');
const statsObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const target = entry.target;
            const finalVal = parseInt(target.getAttribute('data-val'));
            let currentVal = 0;
            const duration = 1500; // 1.5 seconds
            const stepTime = Math.abs(Math.floor(duration / finalVal));
            
            const timer = setInterval(() => {
                currentVal += 1;
                target.textContent = currentVal + (finalVal === 10 ? '+' : '');
                if (currentVal >= finalVal) {
                    clearInterval(timer);
                    target.textContent = finalVal + (finalVal === 10 ? '+' : '');
                }
            }, stepTime);
            
            observer.unobserve(target);
        }
    });
}, {
    threshold: 0.5
});
stats.forEach(stat => statsObserver.observe(stat));

/* ==========================================================================
   BUDGET ESTIMATION CALCULATOR
   ========================================================================== */
const chips = document.querySelectorAll('.calc-chip');
const complexitySlider = document.getElementById('complexity-slider');
const complexityBadge = document.getElementById('complexity-badge');
const checkboxSource = document.getElementById('addon-source');
const checkboxCloud = document.getElementById('addon-cloud');
const checkboxUrgent = document.getElementById('addon-urgent');
const priceDisplay = document.getElementById('calc-price-display');
const breakdownText = document.getElementById('result-breakdown');

let activeBasePrice = 5000;
let activeServiceName = 'AI 算法开发';

// Chips handling
chips.forEach(chip => {
    chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeBasePrice = parseInt(chip.getAttribute('data-base'));
        activeServiceName = chip.textContent;
        calculatePrice();
    });
});

// Slider complexity handling
const complexityLabels = {
    "1": "概念原型 (MVP) (x0.7)",
    "1.5": "轻量定制 (x0.85)",
    "2": "标准交付 (x1.0)",
    "2.5": "进阶系统交付 (x1.25)",
    "3": "深度定制部署 (x1.5)"
};

const complexityMultipliers = {
    "1": 0.7,
    "1.5": 0.85,
    "2": 1.0,
    "2.5": 1.25,
    "3": 1.5
};

complexitySlider.addEventListener('input', () => {
    const val = complexitySlider.value;
    complexityBadge.textContent = complexityLabels[val] || `标准交付 (x1.0)`;
    calculatePrice();
});

// Checkboxes handling
[checkboxSource, checkboxCloud, checkboxUrgent].forEach(cb => {
    cb.addEventListener('change', calculatePrice);
});

function calculatePrice() {
    const multiplier = complexityMultipliers[complexitySlider.value] || 1.0;
    
    // Base Price * Complexity
    let totalPrice = activeBasePrice * multiplier;
    
    // Addons cost
    let addonCost = 0;
    if (checkboxSource.checked) addonCost += parseInt(checkboxSource.getAttribute('data-cost'));
    if (checkboxCloud.checked) addonCost += parseInt(checkboxCloud.getAttribute('data-cost'));
    if (checkboxUrgent.checked) addonCost += parseInt(checkboxUrgent.getAttribute('data-cost'));
    
    totalPrice += addonCost;
    
    // Format and animate number output
    animatePriceDisplay(Math.round(totalPrice));
    
    // Breakdown description
    breakdownText.textContent = `${activeServiceName}基准价: ¥${activeBasePrice} | 系数: ${multiplier}x | 附加交付费用: ¥${addonCost}`;
}

function animatePriceDisplay(targetVal) {
    const startVal = parseInt(priceDisplay.textContent.replace(/,/g, '')) || 0;
    const duration = 300; // ms
    const startTime = performance.now();
    
    function update(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out quadratic
        const ease = progress * (2 - progress);
        const currentVal = Math.round(startVal + (targetVal - startVal) * ease);
        
        priceDisplay.textContent = currentVal.toLocaleString('zh-CN');
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// Initial calculation
calculatePrice();

/* ==========================================================================
   PROJECT DETAILS MODAL & FILTER SYSTEM
   ========================================================================== */
const filterButtons = document.querySelectorAll('.filter-btn');
const projectCards = document.querySelectorAll('.project-card');

filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const filterVal = btn.getAttribute('data-filter');
        
        projectCards.forEach(card => {
            const cardCat = card.getAttribute('data-cat');
            if (filterVal === 'all' || cardCat === filterVal) {
                card.style.display = 'flex';
                // Trigger a slight scale anim for display change
                card.style.animation = 'scaleIn 0.3s var(--transition-smooth)';
            } else {
                card.style.display = 'none';
            }
        });
    });
});

// Modal data injection and setup
const projectDetails = {
    iccv: {
        title: "ICCV 2025 CLVision 挑战赛夺冠系统",
        category: "AI算法/持续学习",
        period: "2025年9月",
        role: "核心开发者 (负责LlaVA核心Attention模型与采样优化)",
        tech: "PyTorch, LLaVA, Continual Learning, Attention Optimization",
        description: `
            <div class="modal-body-section">
                <h4><i data-lucide="award"></i><span>竞赛背景</span></h4>
                <p>ICCV CLVision (Continual Learning in Computer Vision) 是全球顶级的计算机视觉持续学习竞赛。该挑战赛要求模型能够在一连串动态变化的视觉指令任务中学习，同时有效防止对旧任务的“灾难性遗忘”（Catastrophic Forgetting）。</p>
            </div>
            <div class="modal-body-section">
                <h4><i data-lucide="cpu"></i><span>技术突破点</span></h4>
                <ul>
                    <li>提出层级化学习率调度机制，根据神经网络层深自动分配知识保持率，保护关键特征提取器的浅层网络不被过度覆写。</li>
                    <li>实现高自适应采样平衡策略，对新旧任务样本流进行实时的熵值评估，确保回放缓存中信息密度的最大化。</li>
                    <li>基于 LLaVA 大模型优化 Self-Attention 层结构，在 40%+ 的算力预算削减下获得了优于传统持续学习架构的精度表现。</li>
                </ul>
            </div>
            <div class="modal-body-section">
                <h4><i data-lucide="check-square-2"></i><span>交付成果</span></h4>
                <p>最终团队以最优的平均精度（Mean Accuracy）和极低的记忆留存遗忘率（Forgetting Rate）夺得该挑战赛世界第一。交付了完整的持续学习推理优化方案及轻量化训练代码。</p>
            </div>
        `
    },
    cbpnet: {
        title: "边缘端持续反向传播提示网络 (CBPNet)",
        category: "AI/CV 边缘端在投学术成果",
        period: "2024.06 - 2025.09",
        role: "第一作者 (全自主选题、建模、代码编写与论文撰写)",
        tech: "Transformer, Dynamic Neural Networks, PyTorch, CCF-B Submitting",
        description: `
            <div class="modal-body-section">
                <h4><i data-lucide="microscope"></i><span>学术背景</span></h4>
                <p>边缘智能设备（如机器人、智能穿戴）在实际运行中常常需要面临环境变化（多任务部署），但由于硬件内存和存储受限，传统的微调算法容易引起网络参数退化，即“塑性损失（Loss of Plasticity）”。</p>
            </div>
            <div class="modal-body-section">
                <h4><i data-lucide="cpu"></i><span>创新点与架构</span></h4>
                <ul>
                    <li>**持续反向传播机制 (CBP Block)**：动态评估神经网络底层神经元的激活水平，一旦检测到无活力或“死亡”神经元，在训练中进行低存储损耗的重初始化，重新激发模型在多任务下的表征潜力。</li>
                    <li>**轻量提示模块**：结合预训练视觉 Transformer，大幅减少可训练参数到仅原模型的 1.8%，且精度相较传统微调技术提升 12%。</li>
                </ul>
            </div>
            <div class="modal-body-section">
                <h4><i data-lucide="book-open"></i><span>目前进度与交付物</span></h4>
                <p>已完成所有基准线（ImageNet, Split-CIFAR）实验对比，第一作者学术论文已向 CCF-B 类顶会投稿。可提供模型剪枝、轻量化持续微调等边缘设备快速冷启动方案。</p>
            </div>
        `
    },
    mr: {
        title: "基于 3D 姿态估计的混合现实 (MR) 人机交互软件",
        category: "人机交互/计算机视觉",
        period: "2023.03 - 2024.06",
        role: "核心成员 (负责姿态重构算法及模型剪裁)",
        tech: "2D-3D Lifting, TCFormer, WebGL, MR Interaction System",
        description: `
            <div class="modal-body-section">
                <h4><i data-lucide="eye"></i><span>项目背景</span></h4>
                <p>省级创新项目优秀结题。目标是基于日常的 2D 摄像头（如电脑前置镜头），完成高精度的三维人体骨骼及手势追踪，从而替代昂贵的红外动捕设备，实现高响应度的混合现实数字孪生交互。</p>
            </div>
            <div class="modal-body-section">
                <h4><i data-lucide="code"></i><span>核心贡献</span></h4>
                <ul>
                    <li>在 2D-3D 骨骼重构链路中，引入时间上的相邻帧时空注意力，并通过 TCFormer 对人体关节 Token 实施快速聚类，将单帧特征提取耗时缩减 45%。</li>
                    <li>建立底层手部三维位姿与控制指令的映射模块，完成了 MR 系统整体的敏捷迭代测试。</li>
                </ul>
            </div>
            <div class="modal-body-section">
                <h4><i data-lucide="check-circle-2"></i><span>交付成果</span></h4>
                <p>项目以优秀结题。形成了一套标准的手势/肢体姿态控制 Web 软件库，可向客户提供低延时 3D 姿态控制模型开发及 H5 三维场景数据映射服务。</p>
            </div>
        `
    },
    water: {
        title: "水利行业人才共享与外包协作平台",
        category: "全栈开发",
        period: "2023.03 - 2024.03",
        role: "平台负责人 (负责系统全栈开发、数据库设计与部署)",
        tech: "Java, Spring Boot, MyBatis (SSM), MySQL, Vue.js, CentOS",
        description: `
            <div class="modal-body-section">
                <h4><i data-lucide="layout"></i><span>系统定位</span></h4>
                <p>校级创新项目优秀结题。旨在面向传统水利行业技术交流分散的痛点，打造一个包含线上人才匹配、项目任务外包托管、智能合同审核在内的 B2B2C 协作服务平台。</p>
            </div>
            <div class="modal-body-section">
                <h4><i data-lucide="code-2"></i><span>架构与实现</span></h4>
                <ul>
                    <li>采用经典前后端分离的 SSM 软件规范，后端基于 Spring Boot 保证核心服务高并发及高扩展。</li>
                    <li>设计三阶段事务提交机制，保障任务赏金在线支付与合同确认的数据强一致性。</li>
                    <li>部署于阿里云 CentOS 生产环境，利用 Docker 容器化实现敏捷部署与自动化恢复。</li>
                </ul>
            </div>
            <div class="modal-body-section">
                <h4><i data-lucide="file-check"></i><span>工程价值</span></h4>
                <p>已成功申请并取得**国家软件著作权**，相关管理模式论文发表于省级管理学年刊。具备独立承接工业级后台管理系统、行业应用系统以及多端小程序开发全流程经验。</p>
            </div>
        `
    }
};

const modal = document.getElementById('project-modal');
const modalBody = modal.querySelector('.modal-body-content');
const modalClose = modal.querySelector('.modal-close');

document.querySelectorAll('.open-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        const projectId = btn.getAttribute('data-project');
        const data = projectDetails[projectId];
        
        if (data) {
            modalBody.innerHTML = `
                <div class="modal-detail-header">
                    <span class="modal-detail-tag">${data.category}</span>
                    <h2>${data.title}</h2>
                    <div class="modal-meta-grid">
                        <div class="meta-item">📅 <strong>时间段:</strong> ${data.period}</div>
                        <div class="meta-item">👤 <strong>职责角色:</strong> ${data.role}</div>
                        <div class="meta-item" style="grid-column: span 2;">⚙️ <strong>涉及技术:</strong> ${data.tech}</div>
                    </div>
                </div>
                ${data.description}
            `;
            
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Lock background scroll
            lucide.createIcons(); // Initialize icons inside injected content
        }
    });
});

// Close modal function
function closeModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto'; // Restore scroll
}

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

/* ==========================================================================
   EMAIL ONE-CLICK COPY
   ========================================================================== */
const copyBtn = document.querySelector('.copy-btn');
if (copyBtn) {
    copyBtn.addEventListener('click', () => {
        const textToCopy = copyBtn.getAttribute('data-copy');
        navigator.clipboard.writeText(textToCopy).then(() => {
            const icon = copyBtn.querySelector('i');
            icon.setAttribute('data-lucide', 'check');
            lucide.createIcons();
            
            // Show custom cursor notification
            cursorDot.style.background = '#00F5D4';
            setTimeout(() => {
                icon.setAttribute('data-lucide', 'copy');
                lucide.createIcons();
                cursorDot.style.background = '#00F5D4';
            }, 2000);
        }).catch(err => {
            console.error('复制失败: ', err);
        });
    });
}

/* ==========================================================================
   CONTACT FORM HANDLER (Formspree Integration)
   ========================================================================== */
const contactForm = document.getElementById('contact-form');
const successAlert = document.querySelector('.form-success-alert');
const resetFormBtn = document.querySelector('.reset-form-btn');

if (contactForm && successAlert) {
    contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        
        const data = new FormData(contactForm);
        const submitBtn = contactForm.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.querySelector('span').textContent = '正在提交...';
        
        fetch(contactForm.action, {
            method: 'POST',
            body: data,
            headers: {
                'Accept': 'application/json'
            }
        }).then(response => {
            if (response.ok) {
                contactForm.classList.add('hidden');
                successAlert.classList.remove('hidden');
                contactForm.reset();
            } else {
                alert('提交失败，请稍后重试或直接通过邮箱/微信联系我。');
            }
        }).catch(error => {
            console.error('发送错误:', error);
            alert('发生网络连接故障，请检查网络后重新提交，或者直接通过邮箱/微信联系我。');
        }).finally(() => {
            submitBtn.disabled = false;
            submitBtn.querySelector('span').textContent = '提交需求意向';
        });
    });

    if (resetFormBtn) {
        resetFormBtn.addEventListener('click', () => {
            successAlert.classList.add('hidden');
            contactForm.classList.remove('hidden');
        });
    }
}
