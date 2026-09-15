const fs = require('fs');

// PATCH INDEX.HTML
let html = fs.readFileSync('index.html', 'utf8');

const oldStats = \
                <!-- Stats Section -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                    <div style="background: white; padding: 15px; border-radius: 12px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                        <div style="font-size: 24px; font-weight: bold; color: var(--primary-dark);" id="stat-total">0</div>
                        <div style="font-size: 12px; color: #666;">≈Ã„«·Ì «·„‘ —ﬂÌ‰</div>
                    </div>
                    <div style="background: white; padding: 15px; border-radius: 12px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                        <div style="font-size: 24px; font-weight: bold; color: #4CAF50;" id="stat-active">0</div>
                        <div style="font-size: 12px; color: #666;">„‘ —ﬂ ›⁄«·</div>
                    </div>
                    <div style="background: white; padding: 15px; border-radius: 12px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                        <div style="font-size: 24px; font-weight: bold; color: #FF9800;" id="stat-points">0</div>
                        <div style="font-size: 12px; color: #666;">≈Ã„«·Ì «·‰ﬁ«ÿ</div>
                    </div>
                    <div style="background: white; padding: 15px; border-radius: 12px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                        <div style="font-size: 24px; font-weight: bold; color: #2196F3;" id="stat-reports">0</div>
                        <div style="font-size: 12px; color: #666;">≈Ã„«·Ì «· ﬁ«—Ì—</div>
                    </div>
                </div>\;

const newStats = \
                <!-- Stats Section -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px;">
                    <div style="background: white; padding: 10px; border-radius: 12px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        <div style="font-size: 20px; font-weight: bold; color: var(--primary-dark);" id="stat-total">0</div>
                        <div style="font-size: 11px; color: #666;">?? ≈Ã„«·Ì «·„‘ —ﬂÌ‰</div>
                    </div>
                    <div style="background: white; padding: 10px; border-radius: 12px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        <div style="font-size: 20px; font-weight: bold; color: #4CAF50;" id="stat-active">0</div>
                        <div style="font-size: 11px; color: #666;">?? «·›⁄«·Ê‰</div>
                    </div>
                    <div style="background: white; padding: 10px; border-radius: 12px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        <div style="font-size: 20px; font-weight: bold; color: #F44336;" id="stat-suspended">0</div>
                        <div style="font-size: 11px; color: #666;">?? «·„ÊﬁÊ›Ê‰</div>
                    </div>
                    <div style="background: white; padding: 10px; border-radius: 12px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        <div style="font-size: 20px; font-weight: bold; color: #FF9800;" id="stat-expired">0</div>
                        <div style="font-size: 11px; color: #666;">?? «·„‰ ÂÌ…</div>
                    </div>
                    <div style="background: white; padding: 10px; border-radius: 12px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        <div style="font-size: 20px; font-weight: bold; color: #2196F3;" id="stat-reports">0</div>
                        <div style="font-size: 11px; color: #666;">?? ≈Ã„«·Ì «· ﬁ«—Ì—</div>
                    </div>
                    <div style="background: white; padding: 10px; border-radius: 12px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        <div style="font-size: 20px; font-weight: bold; color: #FFC107;" id="stat-points">0</div>
                        <div style="font-size: 11px; color: #666;">? ≈Ã„«·Ì «·‰ﬁ«ÿ</div>
                    </div>
                    <div style="background: white; padding: 10px; border-radius: 12px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        <div style="font-size: 20px; font-weight: bold; color: #9C27B0;" id="stat-points-subs">0</div>
                        <div style="font-size: 11px; color: #666;">? „‘ —ﬂÊ «·‰ﬁ«ÿ</div>
                    </div>
                    <div style="background: white; padding: 10px; border-radius: 12px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        <div style="font-size: 20px; font-weight: bold; color: #3F51B5;" id="stat-unlimited-subs">0</div>
                        <div style="font-size: 11px; color: #666;">?? «·„‘ —ﬂÊ‰ €Ì— «·„ÕœÊœÌ‰</div>
                    </div>
                </div>\;

html = html.replace(oldStats, newStats);

const oldActions = \                    <div id="modal-edit-actions" style="display:none; flex-direction:column; gap:10px; margin-top:20px; padding-top:15px; border-top:1px solid #eee;">
                        <div style="display:flex; gap:10px;">
                            <button class="btn-primary" onclick="app.adminModifyPoints('add')" style="flex:1; background:#4CAF50;">≈÷«›… ‰ﬁ«ÿ ?</button>
                            <button class="btn-primary" onclick="app.adminModifyPoints('remove')" style="flex:1; background:#F44336;">Œ’„ ‰ﬁ«ÿ ?</button>
                        </div>
                        <button class="btn-primary" id="btn-toggle-status" onclick="app.adminToggleStatus()" style="background:#FF9800;">≈Ìﬁ«› «·«‘ —«ﬂ ?</button>
                        <button class="btn-secondary" onclick="app.adminViewLogs()" style="background:#f0f0f0; color:#333; padding:12px; border-radius:8px; font-family:inherit; font-weight:bold; border:none;">?? ⁄—÷ ”Ã· «·⁄„·Ì« </button>
                    </div>\;

const newActions = \
                    <!-- Extra Display for Edit Mode -->
                    <div id="modal-user-info" style="display:none; margin-top:10px; background:#f9f9f9; padding:10px; border-radius:8px; font-size:13px; line-height:1.6;">
                    </div>

                    <div id="modal-edit-actions" style="display:none; flex-direction:column; gap:10px; margin-top:15px; padding-top:15px; border-top:1px solid #eee;">
                        <div style="display:flex; gap:10px;">
                            <button class="btn-primary" onclick="app.adminModifyPoints('add')" style="flex:1; background:#4CAF50;">? ≈÷«›… ‰ﬁ«ÿ</button>
                            <button class="btn-primary" onclick="app.adminModifyPoints('remove')" style="flex:1; background:#F44336;">? Œ’„ ‰ﬁ«ÿ</button>
                        </div>
                        <div style="display:flex; gap:10px;">
                            <button class="btn-primary" onclick="app.adminUpdateSubscriptionType('points')" style="flex:1; background:#FFC107; color:#333;">? «‘ —«ﬂ ‰ﬁ«ÿ</button>
                            <button class="btn-primary" onclick="app.adminUpdateSubscriptionType('unlimited')" style="flex:1; background:#3F51B5;">?? «‘ —«ﬂ €Ì— „ÕœÊœ</button>
                        </div>
                        <button class="btn-primary" onclick="app.adminSaveUser()" style="background:#2196F3;">??  ⁄œÌ· «·«‘ —«ﬂ</button>
                        <button class="btn-primary" onclick="app.adminRenewSub()" style="background:#8BC34A;">??  ÃœÌœ «·«‘ —«ﬂ</button>
                        <button class="btn-secondary" onclick="app.adminViewLogs()" style="background:#f0f0f0; color:#333; padding:12px; border-radius:8px; font-family:inherit; font-weight:bold; border:none;">?? ”Ã· «·⁄„·Ì« </button>
                        <button class="btn-primary" id="btn-toggle-status" onclick="app.adminToggleStatus()" style="background:#FF9800;">?? ≈Ìﬁ«› «·«‘ —«ﬂ</button>
                        <button class="btn-primary" onclick="app.adminCancelSub()" style="background:#E91E63;">? ≈·€«¡ «·«‘ —«ﬂ</button>
                    </div>\;

html = html.replace(oldActions, newActions);
fs.writeFileSync('index.html', html, 'utf8');
console.log('index.html patched.');
