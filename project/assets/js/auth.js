(function(){
'use strict';

var $=function(id){return document.getElementById(id)};

var roleView=$('roleView'),formsContainer=$('formsContainer'),guestPanel=$('guestPanel'),
roleGrid=$('roleGrid'),formBackBtn=$('formBackBtn'),guestBackBtn=$('guestBackBtn'),
quickGuestLink=$('quickGuestLink'),guestToRegister=$('guestToRegister'),
formRoleLabel=$('formRoleLabel'),formSecurityChip=$('formSecurityChip'),
formTabs=$('formTabs'),tabSignIn=$('tabSignIn'),tabSignUp=$('tabSignUp'),
signInForm=$('signInForm'),signUpForm=$('signUpForm'),
signInId=$('signInId'),signInIdLabel=$('signInIdLabel'),
adminLockScreen=$('adminLockScreen'),adminRoleCard=$('adminRoleCard'),
adminLeftItem=$('adminLeftItem'),adminHintDot=$('adminHintDot'),
adminHintText=$('adminHintText'),securityOverlay=$('securityOverlay'),unlockBtn=$('unlockBtn'),
idleIndicator=$('idleIndicator'),idleFill=$('idleFill'),idleTime=$('idleTime'),
successModal=$('successModal'),forgotModal=$('forgotModal'),
uniqueIdValue=$('uniqueIdValue'),copyIdBtn=$('copyIdBtn'),
modalContinue=$('modalContinue'),toastContainer=$('toastContainer'),
signUpPassword=$('signUpPassword'),signUpConfirmPassword=$('signUpConfirmPassword'),
strengthText=$('strengthText'),suggestPasswordBtn=$('suggestPasswordBtn'),
departmentGroup=$('departmentGroup'),departmentSelect=$('departmentSelect'),
departmentLabel=$('departmentLabel'),dobGroup=$('dobGroup'),
avatarUpload=$('avatarUpload'),avatarPreview=$('avatarPreview'),
avatarInput=$('avatarInput'),leftRoles=$('leftRoles'),
oauthDemoModal=$('oauthDemoModal');

var currentRole=null,currentFormType=null,adminCardRevealed=false,
adminFormUnlocked=false,idleTimer=null,idleCountdown=null,idleSeconds=0,
IDLE_TIMEOUT=300,isSessionActive=false,redirectInterval=null,avatarDataUrl=null;

var USERS_KEY='vitalis_users',SESSION_KEY='vitalis_session',AUDIT_KEY='vitalis_audit';

function getUsers(){try{return JSON.parse(localStorage.getItem(USERS_KEY))||[]}catch(e){return[]}}
function saveUsers(u){localStorage.setItem(USERS_KEY,JSON.stringify(u))}
function getSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY))}catch(e){return null}}
function saveSession(d){localStorage.setItem(SESSION_KEY,JSON.stringify(d))}

function addAuditLog(action,details){
    try{var logs=JSON.parse(localStorage.getItem(AUDIT_KEY)||'[]');
    logs.unshift({ts:new Date().toISOString(),action:action,role:currentRole,details:details});
    if(logs.length>100)logs.length=100;
    localStorage.setItem(AUDIT_KEY,JSON.stringify(logs))}catch(e){}
}

var attempts=new Map();
function isRateLimited(fid){
    var now=Date.now(),last=attempts.get(fid)||0;
    if(now-last<2000){showToast('Please wait before trying again','error');return true}
    attempts.set(fid,now);
    if(attempts.size>50){for(var k of attempts.keys()){if(now-attempts.get(k)>60000)attempts.delete(k)}}
    return false;
}

function generateHashId(role){
    var p={admin:'ADM',doctor:'DOC',nurse:'NUR',receptionist:'REC',patient:'PTN'}[role]||'USR';
    var ts=Date.now().toString(36).toUpperCase().padStart(6,'0');
    var rn=Math.random().toString(36).substring(2,8).toUpperCase();
    var by=Array.from(crypto.getRandomValues(new Uint8Array(4)),function(b){return b.toString(16).toUpperCase().padStart(2,'0')}).join('');
    var raw=p+ts+rn+by;
    return raw.substring(0,3)+'-'+raw.substring(3,9)+'-'+raw.substring(9,15)+'-'+raw.substring(15,19);
}

function showToast(msg,type){
    type=type||'info';
    var ic={success:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
    error:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    info:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'};
    var t=document.createElement('div');t.className='toast';
    t.innerHTML='<div class="toast-icon '+type+'">'+ic[type]+'</div><span>'+msg+'</span>';
    toastContainer.appendChild(t);
    setTimeout(function(){t.classList.add('toast-out');setTimeout(function(){t.remove()},300)},4000);
}

function launchConfetti(){
    var c=$('confettiCanvas'),ctx=c.getContext('2d');
    c.width=window.innerWidth;c.height=window.innerHeight;c.classList.add('active');
    var cols=['#7A9CB3','#AD7556','#22C55E','#F59E0B','#A3BFD0','#C49478','#5D8299'],ps=[];
    for(var i=0;i<100;i++)ps.push({x:c.width/2,y:c.height*.4,vx:(Math.random()-.5)*16,vy:(Math.random()-1)*12-4,w:Math.random()*8+4,h:Math.random()*4+2,color:cols[Math.floor(Math.random()*cols.length)],rot:Math.random()*360,rv:(Math.random()-.5)*12,grav:.35,op:1});
    (function anim(){
        ctx.clearRect(0,0,c.width,c.height);var alive=false;
        ps.forEach(function(p){p.x+=p.vx;p.vy+=p.grav;p.y+=p.vy;p.rot+=p.rv;p.op-=.008;p.vx*=.99;
        if(p.op>0){alive=true;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180);ctx.globalAlpha=p.op;ctx.fillStyle=p.color;ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore()}});
        if(alive)requestAnimationFrame(anim);else c.classList.remove('active');
    })();
}

function showView(el){
    [roleView,formsContainer,guestPanel].forEach(function(v){
        if(v===el){v.classList.add('active');v.classList.remove('exit-left')}
        else{v.classList.remove('active');v.classList.add('exit-left')}
    });
    setTimeout(function(){[roleView,formsContainer,guestPanel].forEach(function(v){v.classList.remove('exit-left')})},500);
}

function goBackToRoles(){
    showView(roleView);currentRole=null;currentFormType=null;
    [signInForm,signUpForm].forEach(function(f){if(f)f.reset()});
    clearAllErrors();
}

roleGrid.addEventListener('click',function(e){
    var card=e.target.closest('.role-card');
    if(!card||card.classList.contains('hidden'))return;
    currentRole=card.dataset.role;currentFormType=card.dataset.form;
    leftRoles.querySelectorAll('.left-role-item').forEach(function(it){it.classList.toggle('active',it.dataset.role===currentRole)});
    if(currentFormType==='guest')showView(guestPanel);
    else{showView(formsContainer);setupFormForRole(currentRole,currentFormType)}
});

leftRoles.addEventListener('click',function(e){
    var it=e.target.closest('.left-role-item');
    if(!it||it.classList.contains('hidden'))return;
    var card=roleGrid.querySelector('[data-role="'+it.dataset.role+'"]');
    if(card&&!card.classList.contains('hidden'))card.click();
});

function setupFormForRole(role,formType){
    var names={admin:'Admin Console',doctor:'Doctor Portal',nurse:'Nurse Station',receptionist:'Front Desk',patient:'Patient Portal'};
    formRoleLabel.textContent=names[role]||'Portal';
    if(role==='admin'){
        formSecurityChip.innerHTML='<span class="chip-dot" style="background:#f59e0b"></span><span class="chip-text" style="color:#f59e0b">Restricted</span>';
        formSecurityChip.style.background='rgba(245,158,11,.08)';formSecurityChip.style.borderColor='rgba(245,158,11,.15)';
    }else{
        formSecurityChip.innerHTML='<span class="chip-dot"></span><span class="chip-text">Secure</span>';
        formSecurityChip.style.background='';formSecurityChip.style.borderColor='';
    }
    var idL={admin:'Admin ID',doctor:'Doctor ID',nurse:'Nurse ID',receptionist:'Staff ID',patient:'Patient ID'};
    signInIdLabel.textContent=idL[role]||'ID';
    if(role==='patient'){departmentGroup.classList.add('hidden');dobGroup.classList.remove('hidden')}
    else{departmentGroup.classList.remove('hidden');dobGroup.classList.add('hidden');departmentLabel.textContent='Department'}
    if(role==='admin'&&!adminFormUnlocked){
        adminLockScreen.classList.remove('hidden');signInForm.classList.remove('active');signUpForm.classList.remove('active');formTabs.classList.add('hidden');
        adminHintText.textContent='Press Ctrl+X to unlock';adminHintDot.classList.remove('unlocked');
    }else{adminLockScreen.classList.add('hidden');formTabs.classList.remove('hidden');switchTab('signIn')}
    switchTab('signIn');clearAllErrors();
}

function switchTab(tab){
    var si=tab==='signIn';
    tabSignIn.classList.toggle('active',si);tabSignUp.classList.toggle('active',!si);
    signInForm.classList.toggle('active',si);signUpForm.classList.toggle('active',!si);
}
tabSignIn.addEventListener('click',function(){switchTab('signIn')});
tabSignUp.addEventListener('click',function(){switchTab('signUp')});

formBackBtn.addEventListener('click',goBackToRoles);
guestBackBtn.addEventListener('click',goBackToRoles);
quickGuestLink.addEventListener('click',function(e){e.preventDefault();currentRole='guest';leftRoles.querySelectorAll('.left-role-item').forEach(function(i){i.classList.toggle('active',i.dataset.role==='guest')});showView(guestPanel)});
guestToRegister.addEventListener('click',function(){currentRole='patient';currentFormType='patient';leftRoles.querySelectorAll('.left-role-item').forEach(function(i){i.classList.toggle('active',i.dataset.role==='patient')});showView(formsContainer);setupFormForRole('patient','patient');switchTab('signUp')});

var _tamperGuard=Object.freeze({s:'ctrl-x',n:1});

document.addEventListener('keydown',function(e){
    
    // Step 1: Alt+X reveals admin card
    if(e.altKey&&e.key.toLowerCase()==='x'&&!e.ctrlKey&&!e.shiftKey){
        e.preventDefault();
        if(!adminCardRevealed){
            adminCardRevealed=true;adminRoleCard.classList.remove('hidden');adminLeftItem.classList.remove('hidden');
            showToast('Admin role revealed','info');addAuditLog('admin_revealed','Alt+X');return;
        }
    }
    
    // Step 2: Ctrl+X unlocks admin form
    if(e.ctrlKey&&e.key.toLowerCase()==='x'&&!e.altKey&&!e.shiftKey){
        e.preventDefault();
        if(adminCardRevealed&&currentRole==='admin'&&!adminFormUnlocked){
            adminFormUnlocked=true;adminLockScreen.classList.add('hidden');formTabs.classList.remove('hidden');
            switchTab('signIn');adminHintDot.classList.add('unlocked');
            showToast('Admin access unlocked','success');addAuditLog('admin_unlocked','Ctrl+X');return;
        }
    }
    
    if(isSessionActive)resetIdleTimer();
});

setInterval(function(){
    if(_tamperGuard.s!=='ctrl-x'||_tamperGuard.n!==1){
        adminCardRevealed=false;adminFormUnlocked=false;
        adminRoleCard.classList.add('hidden');adminLeftItem.classList.add('hidden');
        if(currentRole==='admin')goBackToRoles();
    }
},3000);

document.querySelectorAll('.toggle-password').forEach(function(btn){
    btn.addEventListener('click',function(){
        btn.classList.toggle('toggled');
        btn.parentElement.querySelector('.form-input').type=btn.classList.contains('toggled')?'text':'password';
    });
});

var segments=[1,2,3,4].map(function(i){return $('seg'+i)});

function checkStrength(pw){
    var s=0;if(pw.length>=8)s++;if(pw.length>=12)s++;if(/[A-Z]/.test(pw))s++;
    if(/[a-z]/.test(pw))s++;if(/[0-9]/.test(pw))s++;if(/[^A-Za-z0-9]/.test(pw))s++;return s;
}

signUpPassword.addEventListener('input',function(){
    var pw=signUpPassword.value,sc=checkStrength(pw);
    segments.forEach(function(s){s.className='strength-seg'});strengthText.className='strength-text';
    if(!pw.length){strengthText.textContent='Password strength';return}
    var lv,lb;
    if(sc<=2){lv='weak';lb='Weak — add numbers & symbols'}
    else if(sc<=3){lv='fair';lb='Fair — could be stronger'}
    else if(sc<=4){lv='strong';lb='Strong password'}
    else{lv='very-strong';lb='Very strong'}
    var fc=lv==='weak'?1:lv==='fair'?2:lv==='strong'?3:4;
    for(var i=0;i<fc;i++)segments[i].classList.add(lv);
    strengthText.classList.add(lv);strengthText.textContent=lb;
    validateConfirmPassword();
});

suggestPasswordBtn.addEventListener('click',function(){
    var ch='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
    var req=[rc('A-Z'),rc('a-z'),rc('0-9'),rc('!@#$%&*')],ex='';
    for(var i=0;i<8;i++)ex+=ch[Math.floor(Math.random()*ch.length)];
    var a=req.concat(ex.split(''));
    for(var j=a.length-1;j>0;j--){var k=Math.floor(Math.random()*(j+1)),t=a[j];a[j]=a[k];a[k]=t}
    signUpPassword.value=a.join('');signUpPassword.dispatchEvent(new Event('input'));showToast('Strong password generated','info');
});
function rc(r){var p=r.split('-'),s=p[0].charCodeAt(0),e=p[1].charCodeAt(0);return String.fromCharCode(s+Math.floor(Math.random()*(e-s+1)))}

function validateConfirmPassword(){
    var w=signUpConfirmPassword.closest('.input-wrap'),er=$('signUpConfirmPasswordError');
    if(signUpConfirmPassword.value&&signUpConfirmPassword.value!==signUpPassword.value){w.classList.add('error');er.textContent='Passwords do not match';er.classList.add('visible');return false}
    w.classList.remove('error');er.classList.remove('visible');return true;
}
signUpConfirmPassword.addEventListener('input',validateConfirmPassword);

avatarUpload.addEventListener('click',function(){avatarInput.click()});
avatarInput.addEventListener('change',function(){
    var f=avatarInput.files[0];if(!f)return;
    if(f.size>5*1024*1024){showToast('Image must be under 5MB','error');return}
    var r=new FileReader();r.onload=function(e){avatarDataUrl=e.target.result;avatarPreview.innerHTML='<img src="'+avatarDataUrl+'" alt="Avatar">';avatarPreview.classList.add('has-image')};r.readAsDataURL(f);
});

function showFieldError(id,msg){var el=$(id);if(el){el.textContent=msg;el.classList.add('visible')}}
function clearFieldError(id){var el=$(id);if(el){el.textContent='';el.classList.remove('visible')}}
function clearAllErrors(){document.querySelectorAll('.field-error').forEach(function(e){e.textContent='';e.classList.remove('visible')});document.querySelectorAll('.input-wrap.error,.input-wrap.success').forEach(function(w){w.classList.remove('error','success')})}
function shakeEl(el){el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake')}

function validateSignIn(){
    var ok=true,id=signInId.value.trim(),pass=$('signInPassword').value;
    if(!id){showFieldError('signInIdError','Please enter your ID or email');signInId.closest('.input-wrap').classList.add('error');shakeEl(signInId.closest('.input-wrap'));ok=false}
    else{clearFieldError('signInIdError');signInId.closest('.input-wrap').classList.remove('error')}
    if(!pass){showFieldError('signInPasswordError','Please enter your password');$('signInPassword').closest('.input-wrap').classList.add('error');shakeEl($('signInPassword').closest('.input-wrap'));ok=false}
    else{clearFieldError('signInPasswordError');$('signInPassword').closest('.input-wrap').classList.remove('error')}
    if(!ok)showToast('Please check your credentials','error');return ok;
}

function validateSignUp(){
    var ok=true,fn=$('signUpFirstName').value.trim(),ln=$('signUpLastName').value.trim(),
    em=$('signUpEmail').value.trim(),pw=signUpPassword.value,cf=signUpConfirmPassword.value;
    if(!fn){showFieldError('signUpFirstNameError','First name required');$('signUpFirstName').closest('.input-wrap').classList.add('error');shakeEl($('signUpFirstName').closest('.input-wrap'));ok=false}
    else{clearFieldError('signUpFirstNameError');$('signUpFirstName').closest('.input-wrap').classList.remove('error')}
    if(!ln){showFieldError('signUpLastNameError','Last name required');$('signUpLastName').closest('.input-wrap').classList.add('error');shakeEl($('signUpLastName').closest('.input-wrap'));ok=false}
    else{clearFieldError('signUpLastNameError');$('signUpLastName').closest('.input-wrap').classList.remove('error')}
    if(!em||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){showFieldError('signUpEmailError','Valid email required');$('signUpEmail').closest('.input-wrap').classList.add('error');shakeEl($('signUpEmail').closest('.input-wrap'));ok=false}
    else{var us=getUsers();if(us.find(function(u){return u.email.toLowerCase()===em.toLowerCase()})){showFieldError('signUpEmailError','Email already registered');$('signUpEmail').closest('.input-wrap').classList.add('error');ok=false}else{clearFieldError('signUpEmailError');$('signUpEmail').closest('.input-wrap').classList.remove('error')}}
    if(currentFormType!=='patient'&&!departmentSelect.value){departmentSelect.closest('.input-wrap').classList.add('error');ok=false}else{departmentSelect.closest('.input-wrap').classList.remove('error')}
    if(currentFormType==='patient'&&!$('dobInput').value){showFieldError('dobError','Date of birth required');$('dobInput').closest('.input-wrap').classList.add('error');ok=false}else{clearFieldError('dobError');if($('dobInput'))$('dobInput').closest('.input-wrap').classList.remove('error')}
    if(!pw||pw.length<8){showFieldError('signUpPasswordError','Minimum 8 characters');signUpPassword.closest('.input-wrap').classList.add('error');shakeEl(signUpPassword.closest('.input-wrap'));ok=false}
    else if(checkStrength(pw)<3){showFieldError('signUpPasswordError','Password too weak');signUpPassword.closest('.input-wrap').classList.add('error');ok=false}
    else{clearFieldError('signUpPasswordError');signUpPassword.closest('.input-wrap').classList.remove('error')}
    if(!cf||cf!==pw){showFieldError('signUpConfirmPasswordError','Passwords do not match');signUpConfirmPassword.closest('.input-wrap').classList.add('error');shakeEl(signUpConfirmPassword.closest('.input-wrap'));ok=false}
    else{clearFieldError('signUpConfirmPasswordError');signUpConfirmPassword.closest('.input-wrap').classList.remove('error')}
    if(!ok)showToast('Please fix the errors above','error');return ok;
}

signInForm.addEventListener('submit',function(e){
    e.preventDefault();if(isRateLimited('signIn'))return;if(!validateSignIn())return;
    var btn=$('signInBtn'),txt=btn.querySelector('.btn-text'),ldr=btn.querySelector('.btn-loader');
    txt.classList.add('hidden');ldr.classList.remove('hidden');btn.classList.add('loading');btn.disabled=true;
    setTimeout(function(){
        var iv=signInId.value.trim().toLowerCase(),pv=$('signInPassword').value,us=getUsers(),
        fd=us.find(function(u){return(u.id.toLowerCase()===iv||u.email.toLowerCase()===iv)&&u.password===pv&&u.role===currentRole});
        txt.classList.remove('hidden');ldr.classList.add('hidden');btn.classList.remove('loading');btn.disabled=false;
        if(fd){saveSession({role:fd.role,id:fd.id,name:fd.firstName+' '+fd.lastName,email:fd.email});isSessionActive=true;startIdleTimer();addAuditLog('login',fd.role+' logged in');showToast('Welcome back, '+fd.firstName+'!','success');setTimeout(function(){window.location.href='dashboard.html'},800)}
        else{shakeEl(signInForm);addAuditLog('login_failed','Failed: "'+iv+'" as '+currentRole);showToast('Invalid ID or password','error')}
    },400);
});

signUpForm.addEventListener('submit',function(e){
    e.preventDefault();if(isRateLimited('signUp'))return;if(!validateSignUp())return;
    var btn=$('signUpBtn'),txt=btn.querySelector('.btn-text'),ldr=btn.querySelector('.btn-loader');
    txt.classList.add('hidden');ldr.classList.remove('hidden');btn.classList.add('loading');btn.disabled=true;
    setTimeout(function(){
        var hid=generateHashId(currentRole),user={id:hid,role:currentRole,firstName:$('signUpFirstName').value.trim(),lastName:$('signUpLastName').value.trim(),email:$('signUpEmail').value.trim().toLowerCase(),password:signUpPassword.value,department:currentFormType!=='patient'?departmentSelect.value:null,dob:currentFormType==='patient'?$('dobInput').value:null,avatar:avatarDataUrl,emailVerified:false,socialProviders:[],createdAt:new Date().toISOString(),lastLogin:new Date().toISOString()};
        var us=getUsers();us.push(user);saveUsers(us);saveSession({role:user.role,id:user.id,name:user.firstName+' '+user.lastName,email:user.email});
        uniqueIdValue.textContent=hid;successModal.classList.add('active');launchConfetti();addAuditLog('register','New '+currentRole+': '+hid);
        txt.classList.remove('hidden');ldr.classList.add('hidden');btn.classList.remove('loading');btn.disabled=false;startRedirectCountdown();
    },500);
});

function startRedirectCountdown(){
    var count=10,el=$('redirectCountdown'),tm=$('redirectTimer');tm.style.display='';el.textContent=count;
    clearInterval(redirectInterval);
    redirectInterval=setInterval(function(){count--;el.textContent=count;if(count<=0){clearInterval(redirectInterval);successModal.classList.remove('active');window.location.href='dashboard.html'}},1000);
}

modalContinue.addEventListener('click',function(){clearInterval(redirectInterval);successModal.classList.remove('active');isSessionActive=true;startIdleTimer();window.location.href='dashboard.html'});

copyIdBtn.addEventListener('click',function(){
    var id=uniqueIdValue.textContent;
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(id).then(function(){copyIdBtn.classList.add('copied');copyIdBtn.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg><span>Copied!</span>';showToast('ID copied','success');setTimeout(function(){copyIdBtn.classList.remove('copied');copyIdBtn.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg><span>Copy</span>'},2000)})}
    else{var ta=document.createElement('textarea');ta.value=id;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');showToast('ID copied','success')}catch(ex){showToast('Failed to copy','error')}document.body.removeChild(ta)}
});

 $('forgotIdLink').addEventListener('click',function(e){e.preventDefault();forgotModal.classList.add('active')});
 $('forgotCancel').addEventListener('click',function(){forgotModal.classList.remove('active')});
 $('forgotSubmitBtn').addEventListener('click',function(){
    var em=$('forgotEmail').value.trim();
    if(!em||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){showFieldError('forgotEmailError','Enter a valid email');$('forgotEmail').closest('.input-wrap').classList.add('error');return}
    clearFieldError('forgotEmailError');var us=getUsers(),fd=us.find(function(u){return u.email.toLowerCase()===em.toLowerCase()});
    if(fd){addAuditLog('id_recovery','Found: '+fd.id);forgotModal.classList.remove('active');showToast('Your ID is: '+fd.id,'success')}
    else{addAuditLog('id_recovery_failed','Not found: '+em);showToast('No account found with that email','error')}
});

var OAUTH={googleClientId:'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',facebookAppId:'YOUR_FACEBOOK_APP_ID',twitterClientId:'YOUR_TWITTER_CLIENT_ID',baseUrl:window.location.origin};

function isDemo(p){return OAUTH[p+'ClientId'||p+'AppId'].toString().indexOf('YOUR_')===0}

function initGoogleAuth(){if(typeof google==='undefined'||!google.accounts)return;try{google.accounts.id.initialize({client_id:OAUTH.googleClientId,callback:handleGoogleResponse,auto_select:false,cancel_on_tap_out:false})}catch(e){}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(initGoogleAuth,500)});else setTimeout(initGoogleAuth,500);

function handleGoogleResponse(resp){
    if(!resp||resp.error){showToast('Google sign-in cancelled','error');resetSocialBtn($('googleAuthBtn'),'Google');return}
    var payload;try{var p=resp.credential.split('.');payload=JSON.parse(atob(p[1].replace(/-/g,'+').replace(/_/g,'/')))}catch(e){showToast('Failed to read Google response','error');resetSocialBtn($('googleAuthBtn'),'Google');return}
    processSocialLogin({provider:'google',providerUserId:payload.sub,email:payload.email,firstName:payload.given_name||'',lastName:payload.family_name||'',picture:payload.picture,emailVerified:payload.email_verified===true});
}

 $('googleAuthBtn').addEventListener('click',function(){
    if(OAUTH.googleClientId.indexOf('YOUR_')===0){showOAuthDemo('google');return}
    if(typeof google==='undefined'||!google.accounts){showToast('Google SDK not loaded','error');return}
    setSocialBtnLoading($('googleAuthBtn'));addAuditLog('google_auth','Clicked');
    try{google.accounts.id.prompt(function(n){if(n.isNotDisplayed()||n.isSkippedMoment())resetSocialBtn($('googleAuthBtn'),'Google')})}catch(e){showToast('Google error','error');resetSocialBtn($('googleAuthBtn'),'Google')}
});

window.fbAsyncInit=function(){if(typeof FB==='undefined')return;try{FB.init({appId:OAUTH.facebookAppId,cookie:true,xfbml:false,version:'v18.0'})}catch(e){}};

 $('facebookAuthBtn').addEventListener('click',function(){
    if(OAUTH.facebookAppId.indexOf('YOUR_')===0){showOAuthDemo('facebook');return}
    if(typeof FB==='undefined'){showToast('Facebook SDK not loaded','error');return}
    setSocialBtnLoading($('facebookAuthBtn'));addAuditLog('facebook_auth','Clicked');
    FB.login(function(resp){
        if(resp.authResponse){FB.api('/me',{fields:'id,name,email,picture.width(200).height(200)'},function(prof){
            if(prof.error){showToast('Facebook profile fetch failed','error');resetSocialBtn($('facebookAuthBtn'),'Facebook');return}
            var np=(prof.name||'').split(' ');processSocialLogin({provider:'facebook',providerUserId:prof.id,email:prof.email||'',firstName:np[0]||'',lastName:np.slice(1).join(' ')||'',picture:prof.picture&&prof.picture.data?prof.picture.data.url:null,emailVerified:true});
        })}else{showToast('Facebook sign-in cancelled','error');resetSocialBtn($('facebookAuthBtn'),'Facebook')}
    },{scope:'email,public_profile',return_scopes:true});
});

function b64url(buf){return String.fromCharCode.apply(null,buf).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function genVerifier(){return b64url(crypto.getRandomValues(new Uint8Array(32)))}
async function genChallenge(v){return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v))))}

 $('twitterAuthBtn').addEventListener('click',async function(){
    if(OAUTH.twitterClientId.indexOf('YOUR_')===0){showOAuthDemo('twitter');return}
    setSocialBtnLoading($('twitterAuthBtn'));addAuditLog('twitter_auth','Clicked');
    try{var ver=genVerifier(),cha=await genChallenge(ver);sessionStorage.setItem('twitter_pkce_verifier',ver);
    var st=Array.from(crypto.getRandomValues(new Uint8Array(16)),function(b){return b.toString(16).padStart(2,'0')}).join('');
    var p=new URLSearchParams({response_type:'code',client_id:OAUTH.twitterClientId,redirect_uri:OAUTH.baseUrl+'/auth/twitter-callback.php',scope:'tweet.read users.read offline.access',state:st,code_challenge:cha,code_challenge_method:'S256'});
    window.location.href='https://twitter.com/i/oauth2/authorize?'+p.toString()}catch(e){showToast('Twitter error','error');resetSocialBtn($('twitterAuthBtn'),'X')}
});

var pendingOAuthProvider=null;

var DEMO_SCOPES={
    google:['Your name and profile info','Your email address','Your profile picture'],
    facebook:['Your public profile','Your email address','Your profile picture'],
    twitter:['Your account info','Your email address','Read your posts']
};

var DEMO_PROFILES={
    google:{firstName:'Sarah',lastName:'Chen',email:'sarah.chen.demo@gmail.com',picture:null,providerUserId:'g_1092837465'},
    facebook:{firstName:'James',lastName:'Okonkwo',email:'james.okonkwo.demo@facebook.com',picture:null,providerUserId:'f_2847361940'},
    twitter:{firstName:'Maya',lastName:'Rodriguez',email:'maya.r.demo@x.com',picture:null,providerUserId:'t_9182736450'}
};

var DEMO_BRAND={
    google:{color:'#4285F4',bg:'linear-gradient(135deg,#4285F4,#34A853)',logo:'<svg width="36" height="36" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>',title:'Sign in with Google'},
    facebook:{color:'#1877F2',bg:'linear-gradient(135deg,#1877F2,#0D65D9)',logo:'<svg width="36" height="36" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',title:'Continue with Facebook'},
    twitter:{color:'#000',bg:'linear-gradient(135deg,#14171A,#333)',logo:'<svg width="36" height="36" viewBox="0 0 24 24" fill="#FFF"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',title:'Sign in with X'}
};

function showOAuthDemo(provider){
    pendingOAuthProvider=provider;
    var brand=DEMO_BRAND[provider],scopes=DEMO_SCOPES[provider];
    $('oauthDemoHeader').style.background=brand.bg;
    $('oauthDemoLogo').innerHTML=brand.logo;
    $('oauthDemoTitle').textContent=brand.title;
    var scopeHtml='';
    scopes.forEach(function(s){scopeHtml+='<li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'+s+'</li>'});
    $('oauthDemoScopes').innerHTML=scopeHtml;
    oauthDemoModal.classList.add('active');
    addAuditLog(provider+'_demo','Demo OAuth flow started');
}

 $('oauthDemoCancel').addEventListener('click',function(){
    oauthDemoModal.classList.remove('active');pendingOAuthProvider=null;
    showToast('Sign-in cancelled','info');
});

 $('oauthDemoAllow').addEventListener('click',function(){
    if(!pendingOAuthProvider)return;
    var p=pendingOAuthProvider,prof=DEMO_PROFILES[p];
    oauthDemoModal.classList.remove('active');
    setSocialBtnLoading($({google:'googleAuthBtn',facebook:'facebookAuthBtn',twitter:'twitterAuthBtn'}[p]));
    setTimeout(function(){
        processSocialLogin({provider:p,providerUserId:prof.providerUserId,email:prof.email,firstName:prof.firstName,lastName:prof.lastName,picture:prof.picture,emailVerified:true});
        pendingOAuthProvider=null;
    },600);
});

function processSocialLogin(profile){
    var users=getUsers(),email=profile.email.toLowerCase(),provider=profile.provider,puid=profile.providerUserId;
    var existingProvider=users.find(function(u){return u.socialProviders&&u.socialProviders.some(function(sp){return sp.provider===provider&&sp.providerUserId===puid})});
    if(existingProvider){
        existingProvider.lastLogin=new Date().toISOString();saveUsers(users);
        saveSession({role:existingProvider.role,id:existingProvider.id,name:existingProvider.firstName+' '+existingProvider.lastName,email:existingProvider.email,provider:provider});
        isSessionActive=true;startIdleTimer();addAuditLog('social_login',provider+' login: '+existingProvider.id);
        showToast('Welcome back, '+existingProvider.firstName+'!','success');
        setTimeout(function(){window.location.href='dashboard.html'},800);return;
    }
    var existingEmail=users.find(function(u){return u.email.toLowerCase()===email});
    if(existingEmail){
        if(!existingEmail.socialProviders)existingEmail.socialProviders=[];
        if(!existingEmail.socialProviders.some(function(sp){return sp.provider===provider})){
            existingEmail.socialProviders.push({provider:provider,providerUserId:puid,linkedAt:new Date().toISOString()});
        }
        existingEmail.lastLogin=new Date().toISOString();
        if(profile.emailVerified)existingEmail.emailVerified=true;
        if(profile.picture&&!existingEmail.avatar)existingEmail.avatar=profile.picture;
        saveUsers(users);saveSession({role:existingEmail.role,id:existingEmail.id,name:existingEmail.firstName+' '+existingEmail.lastName,email:existingEmail.email,provider:provider});
        isSessionActive=true;startIdleTimer();addAuditLog('social_link',provider+' linked to '+existingEmail.id);
        showToast('Account linked! Welcome back, '+existingEmail.firstName+'.','success');
        setTimeout(function(){window.location.href='dashboard.html'},800);return;
    }
    var hid=generateHashId('patient'),nu={id:hid,role:'patient',firstName:profile.firstName,lastName:profile.lastName,email:email,password:null,avatar:profile.picture,emailVerified:profile.emailVerified||false,department:null,dob:null,socialProviders:[{provider:provider,providerUserId:puid,linkedAt:new Date().toISOString()}],createdAt:new Date().toISOString(),lastLogin:new Date().toISOString()};
    users.push(nu);saveUsers(users);saveSession({role:nu.role,id:nu.id,name:nu.firstName+' '+nu.lastName,email:nu.email,provider:provider});
    uniqueIdValue.textContent=hid;successModal.classList.add('active');launchConfetti();startRedirectCountdown();
    isSessionActive=true;startIdleTimer();addAuditLog('social_register',provider+' new user: '+hid);
    showToast('Account created via '+provider.charAt(0).toUpperCase()+provider.slice(1)+'!','success');
    resetSocialBtn($({google:'googleAuthBtn',facebook:'facebookAuthBtn',twitter:'twitterAuthBtn'}[provider]),provider.charAt(0).toUpperCase()+provider.slice(1));
}

function setSocialBtnLoading(btn){
    btn.disabled=true;btn.style.opacity='.7';
    btn.innerHTML='<span class="btn-loader" style="width:16px;height:16px;border-color:var(--clove-faint);border-top-color:var(--clove)"></span> Connecting...';
}

function resetSocialBtn(btn,name){
    if(!btn)return;btn.disabled=false;btn.style.opacity='';
    var ic={Google:'<svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>',Facebook:'<svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',X:'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>'};
    btn.innerHTML=(ic[name]||'')+' '+name;
}

function startIdleTimer(){
    idleSeconds=IDLE_TIMEOUT;clearTimeout(idleTimer);clearInterval(idleCountdown);
    idleIndicator.classList.remove('active');securityOverlay.classList.remove('active');
    idleTimer=setTimeout(function(){showIdleWarning()},(IDLE_TIMEOUT-60)*1000);
}

function showIdleWarning(){
    idleIndicator.classList.add('active');idleSeconds=60;
    idleCountdown=setInterval(function(){
        idleSeconds--;var m=Math.floor(idleSeconds/60),s=idleSeconds%60;
        idleTime.textContent=m+':'+(s<10?'0':'')+s;
        idleFill.style.strokeDashoffset=100-((60-idleSeconds)/60)*100;
        if(idleSeconds<=0){clearInterval(idleCountdown);lockSession()}
    },1000);
}

function lockSession(){idleIndicator.classList.remove('active');securityOverlay.classList.add('active');isSessionActive=false;localStorage.removeItem(SESSION_KEY)}

unlockBtn.addEventListener('click',function(){securityOverlay.classList.remove('active');goBackToRoles()});

var lastActivity=Date.now();
['mousemove','keydown','scroll','touchstart'].forEach(function(ev){
    document.addEventListener(ev,function(){
        if(isSessionActive){lastActivity=Date.now();if(idleSeconds<IDLE_TIMEOUT&&idleSeconds>0)startIdleTimer()}
    },{passive:true});
});

})();