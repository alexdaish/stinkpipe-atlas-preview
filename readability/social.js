// Public social counts are separate from private sign-in and favourite choices.
let socialSummary={favourites:{},leaderboard:[],popular:[]};
let socialMe={signedIn:false,profile:null,favourites:[]};
let socialLoading=null;
function socialEntry(id){return entries.find(p=>p.id===id)}
function renderCommunity(){
 const leaders=$('#leaderboardList'),popular=$('#popularList');leaders.replaceChildren();popular.replaceChildren();
 for(const person of socialSummary.leaderboard||[]){const li=el('li','community-row');const b=el('button','community-person');b.append(el('span','rank',String(person.rank)),el('span','',person.alias),el('strong','',`${person.spots} ${person.spots===1?'spot':'spots'}`));b.onclick=()=>openSpotter(person.id);li.append(b);leaders.append(li)}
 if(!leaders.children.length)leaders.append(el('li','community-empty','The first approved new discovery starts the leaderboard. Sign in before you submit to earn discovery credit.'));
 for(const item of socialSummary.popular||[]){const p=socialEntry(item.entryId);if(!p)continue;const li=el('li','community-row'),b=el('button','community-person');b.append(el('span','heart-small','♥'),el('span','',p.title),el('strong','',String(item.favourites)));b.onclick=()=>select(p);li.append(b);popular.append(li)}
 if(!popular.children.length)popular.append(el('li','community-empty','No favourites yet. Select a pipe on the map and give it the first vote.'));
 $('#communityProfile').textContent=socialMe.profile?'Your spotter profile':socialMe.signedIn?'Choose your alias':'Join the community';
 if(selected&&$('#detail').open)renderRecordSocial(selected);if($('#formDialog').open)window.dispatchEvent(new Event('atlas:form'));
}
async function loadSocial(){
 if(socialLoading)return socialLoading;
 socialLoading=(async()=>{try{const [summary,me]=await Promise.all([api('/api/social/summary'),api('/api/social/me')]);socialSummary=summary;socialMe=me;renderCommunity();$('#socialStatus').textContent=''}catch(e){$('#socialStatus').textContent='Community features are unavailable. You can still explore the map.'}finally{socialLoading=null}})();return socialLoading;
}
function renderRecordSocial(p){
 $('#favouriteButton')?.remove();$('#favouriteMessage')?.remove();if(p.kind==='Research note')return;const area=$('#recordSocial');if(!area)return;
 const count=Number(socialSummary.favourites?.[p.id]||0),active=(socialMe.favourites||[]).includes(p.id);
 const vote=el('button',active?'favourite-button active':'favourite-button',`${active?'Favourited':'Favourite'} · ${count}`);vote.id='favouriteButton';vote.setAttribute('aria-pressed',String(active));
 const message=el('p','muted');message.id='favouriteMessage';message.setAttribute('role','status');
 vote.onclick=async()=>{if(!socialMe.signedIn){openSocialProfile();return}vote.disabled=true;try{await api('/api/social/favourite',{entryId:p.id,favourite:!active});await loadSocial()}catch(e){message.textContent=e.message;vote.disabled=false}};
 area.prepend(vote);area.append(message);
}
async function openSocialProfile(){
 if($('#detail').open)$('#detail').close();
 $('#profileMessage').textContent='';$('#socialSignIn').hidden=Boolean(socialMe.signedIn);$('#profileForm').hidden=!socialMe.signedIn;
 const signIn=$('#socialSignIn a');signIn.href='/signin-with-chatgpt?return_to='+encodeURIComponent(selected&&location.hash.startsWith('#pipe=')?'/#pipe='+encodeURIComponent(selected.id):'/#community');
 if(socialMe.signedIn){const f=$('#profileForm');f.elements.alias.value=socialMe.profile?.alias||'';f.elements.optIn.checked=Boolean(socialMe.profile?.visible);if(socialMe.profile?.suspended)$('#profileMessage').textContent='This profile is hidden by the operator. Contact Alex if you think this is an error.'}
 if(!$('#profileDialog').open)$('#profileDialog').showModal();
}
$('#profileBtn').onclick=openSocialProfile;$('#communityProfile').onclick=openSocialProfile;
$('#profileForm').onsubmit=async e=>{e.preventDefault();const f=e.target,b=f.querySelector('[type=submit]');b.disabled=true;try{await api('/api/social/profile',{alias:f.elements.alias.value.trim(),optIn:f.elements.optIn.checked});await loadSocial();$('#profileMessage').textContent=f.elements.optIn.checked?'Profile saved. Your alias and approved discoveries can appear publicly.':'Profile saved. Your alias is hidden from public rankings.'}catch(err){$('#profileMessage').textContent=err.message}finally{b.disabled=false}};
async function openSpotter(id){const body=$('#spotterBody');body.replaceChildren(el('p','','Loading spotter…'));$('#spotterDialog').showModal();try{const p=await api('/api/social/profiles/'+encodeURIComponent(id));body.replaceChildren(el('h2','',p.alias),el('p','',`${p.spots} approved ${p.spots===1?'new discovery':'new discoveries'}`));for(const entryId of p.discoveries||[]){const entry=socialEntry(entryId);if(!entry)continue;const b=el('button','card',entry.title);b.onclick=()=>{$('#spotterDialog').close();select(entry)};body.append(b)}if(!p.discoveries?.length)body.append(el('p','muted','No approved discoveries to show yet.'));const share=el('button','','Share this spotter profile'),message=el('p','muted');message.setAttribute('role','status');share.onclick=async()=>{const url=new URL(window.atlasPreviewBase+'?spotter='+encodeURIComponent(p.id)+'#community',location.origin).href;try{if(navigator.share)await navigator.share({title:p.alias+' · Stinkpipe Atlas',text:'Explore this spotter’s approved discoveries.',url});else{await navigator.clipboard.writeText(url);message.textContent='Profile link copied.'}}catch(e){if(e.name!=='AbortError')message.textContent=url}};body.append(share,message)}catch(e){body.replaceChildren(el('p','',e.message))}}
window.addEventListener('atlas:record',e=>renderRecordSocial(e.detail));
window.addEventListener('atlas:loaded',()=>loadSocial());
loadSocial().then(()=>{if(location.hash==='#community'&&socialMe.signedIn&&!socialMe.profile)openSocialProfile()});

async function loadProfileModeration(){try{const rows=await api('/api/social/admin/profiles');let holder=$('#profileModeration');if(!holder){holder=el('section');holder.id='profileModeration';$('#review').append(holder)}holder.replaceChildren(el('h3','','Public profiles'));if(!rows.length)holder.append(el('p','muted','No public profiles yet.'));for(const profile of rows){const row=el('div','queue-card');row.append(el('strong','',profile.alias),el('p','muted',profile.suspended?'Hidden by operator':profile.visible?'Public alias':'Private alias'));const button=el('button','',profile.suspended?'Restore profile':'Hide profile');button.onclick=async()=>{button.disabled=true;try{await api('/api/social/admin/profile',{id:profile.id,hidden:!profile.suspended});await loadProfileModeration();await loadSocial()}catch(e){$('#reviewMessage').textContent=e.message;button.disabled=false}};row.append(button);holder.append(row)}}catch(e){$('#reviewMessage').textContent=e.message}}
window.addEventListener('atlas:owner',loadProfileModeration);

window.addEventListener('atlas:form',()=>{$('#contributionSignIn').hidden=Boolean(socialMe.signedIn);$('#spotterCreditNote').textContent=socialMe.signedIn?'You are signed in. Discovery points belong to your spotter profile. The credit name below appears only on this record. Corrections do not earn points.':'Sign in before submitting if you want leaderboard credit. Anonymous submissions are welcome.'});
function privacyFromHash(){if(location.hash==='#privacy'&&!$('#policy').open)openPolicy()}window.addEventListener('hashchange',privacyFromHash);privacyFromHash();

$('#contributionSignIn').addEventListener('click',()=>{const f=$('#form');const fields={};for(const name of ['title','description','lat','lng','correction','credit'])fields[name]=f.elements[name].value;try{sessionStorage.setItem('atlas-contribution-draft',JSON.stringify({saved:Date.now(),fields}))}catch{}});
function restoreContributionDraft(){if(location.hash!=='#contribute')return;let draft=null;try{draft=JSON.parse(sessionStorage.getItem('atlas-contribution-draft')||'null');sessionStorage.removeItem('atlas-contribution-draft')}catch{}openForm();if(draft&&Number.isFinite(draft.saved)&&Date.now()-draft.saved<7200000){const f=$('#form');for(const name of ['title','description','lat','lng','correction','credit'])if(typeof draft.fields?.[name]==='string')f.elements[name].value=draft.fields[name];if(f.elements.lat.value&&f.elements.lng.value)showContributionForm();$('#formMessage').textContent='Text draft restored. Reattach your photo and enter contact email again if needed.'}}window.addEventListener('hashchange',restoreContributionDraft);restoreContributionDraft();

loadSocial().then(()=>{const profileId=new URLSearchParams(location.search).get('spotter');if(profileId&&/^[A-Za-z0-9_-]{1,100}$/.test(profileId))openSpotter(profileId)});
