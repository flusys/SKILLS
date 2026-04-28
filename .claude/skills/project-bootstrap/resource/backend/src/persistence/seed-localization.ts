import { DataSource } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { migrationConfig } from "./migration.config";

const ENABLE_STORAGE = true;
const ENABLE_EMAIL = true;
const ENABLE_FORM_BUILDER = true;
const ENABLE_EVENT_MANAGER = true;
const ENABLE_NOTIFICATION = true;
const ENABLE_LOCALIZATION = true;

const SHARED_MESSAGES: Record<string, string> = {
  // Backend shared auth key (used by exception filters)
  "auth.token.required": "Refresh token is required",
  "auth.token.invalid": "Invalid token",
  "entity.belongs.another.company": "{{entity}} belongs to another company",
  "auth.company.no.access": "No access to this company",

  // Backend error keys (used by exception filters)
  "error.not.found": "Resource not found",
  "error.validation": "Validation failed",
  "error.unauthorized": "Unauthorized access",
  "error.forbidden": "Access forbidden",
  "error.conflict": "Resource conflict",
  "error.internal": "Internal server error",
  "error.service.unavailable": "Service temporarily unavailable",
  "error.unknown": "Unknown error occurred",
  "error.http": "HTTP error",
  "error.generic": "An error occurred",
  "error.permission.system.unavailable":
    "Permission system temporarily unavailable. Please try again later.",
  "error.insufficient.permissions":
    "Missing required permissions: {{permissions}}",
  "error.insufficient.permissions.or":
    "Requires at least one of: {{permissions}}",
  "error.no.permissions.found":
    "No permissions found. Please contact administrator.",
  "error.endpoint.disabled": "Endpoint {{endpoint}} is disabled",

  // Backend system keys (infrastructure errors)
  "system.repository.not.available": "{{entity}} repository not available",
  "system.datasource.not.available": "Data source not available",
  "system.database.config.not.available":
    "Database configuration not available",
  "system.service.not.available":
    'Service "{{provider}}" not available. Available: {{available}}',
  "system.config.required": "Configuration required",
  "system.internal.error": 'Failed to initialize "{{provider}}": {{error}}',
  "system.duplicate.request": "Duplicate request detected",
  "system.invalid.tenant.id": "Invalid tenant ID",
  "system.tenant.not.found": 'Tenant "{{tenantId}}" not found',
  "system.tenant.header.required":
    'Tenant not found. Ensure "{{header}}" header is set.',
  "system.missing.parameter": "Missing required parameter: {{key}}",
  "system.sdk.not.installed":
    'Required SDK "{{sdk}}" not installed. Run: npm install {{sdk}}',
  "system.path.traversal.detected": "Path traversal detected",
  "system.invalid.file.key": "Invalid file key",

  // utils/base-list-page.ts
  "shared.success": "Success",
  "shared.error": "Error",
  "shared.info": "Info",
  "shared.warning": "Warning",
  "shared.confirm.delete.header": "Confirm Delete",

  // utils/base-form-page.ts
  "shared.validation.error": "Validation Error",
  "shared.fill.required.fields": "Please fill in all required fields",

  // components/file-selector-dialog/file-selector-dialog.component.ts
  "shared.file.selector.provider.not.configured":
    "File selection not configured.",
  "shared.file.selector.add.provider": "Add",
  "shared.close": "Close",
  "shared.file.selector.search.placeholder": "Search files...",
  "shared.file.selector.all.folders": "All Folders",
  "shared.file.selector.all.storage": "All Storage",
  "shared.default": "Default",
  "shared.file.selector.selected": "{{count}} selected",
  "shared.file.selector.no.files": "No files found",
  "shared.cancel": "Cancel",
  "shared.file.selector.select.multiple": "Select ({{count}})",
  "shared.file.selector.select": "Select",
  "shared.file.selector.select.files": "Select Files",
  "shared.file.selector.select.file": "Select File",

  // components/file-uploader/file-uploader.component.ts
  "shared.upload.provider.not.configured":
    "File upload not configured. Add {{provider}} to your app config.",
  "shared.upload.uploading": "Uploading {{fileName}}...",
  "shared.upload.drop.multiple": "Drop files here or click to upload",
  "shared.upload.drop.single": "Drop file here or click to upload",
  "shared.upload.allowed.types": "Allowed:",
  "shared.upload.all.types.allowed": "All file types allowed",
  "shared.upload.max.size": "(Max {{size}}MB)",
  "shared.file.uploader.no.upload.function":
    "No upload function available. Configure FILE_PROVIDER or provide uploadFile input.",
  "shared.file.type.images": "Images",
  "shared.file.type.documents": "Documents",
  "shared.file.type.videos": "Videos",
  "shared.file.type.audio": "Audio",
  "shared.upload.invalid.type": "Invalid File Type",
  "shared.upload.file.too.large": "File Too Large",
  "shared.size.mb": "MB",
  "shared.upload.files": "files",
  "shared.upload.complete": "Upload Complete",
  "shared.upload.failed": "Upload failed",
  "shared.upload.files.uploaded": "{{count}} file(s) uploaded successfully",
  "shared.size.kb": "KB",

  // components/lazy-select/lazy-select.component.ts
  "shared.select.placeholder": "Select Option",

  // components/lazy-multi-select/lazy-multi-select.component.ts
  "shared.multi.select.placeholder": "Select Options",
  "shared.multi.select.items.selected": "{{count}} Items Selected",

  // components/user-select/base-user-select.class.ts
  "shared.user.select.placeholder": "Select User",

  // cross-package shared keys (shared.* — used across feature packages)
  "shared.actions": "Actions",
  "shared.active": "Active",
  "shared.add": "Add",
  "shared.created": "Created",
  "shared.all": "All",
  "shared.assigned": "Assigned",
  "shared.back": "Back",
  "shared.code": "Code",
  "shared.company": "Company",
  "shared.confirm": "Confirm",
  "shared.confirm.delete": "Are you sure you want to delete this item?",
  "shared.confirm.delete.item": 'Are you sure you want to delete "{{name}}"?',
  "shared.continue": "Continue",
  "shared.create": "Create",
  "shared.delete": "Delete",
  "shared.description": "Description",
  "shared.description.placeholder": "Enter description",
  "shared.deselect.all": "Deselect All",
  "shared.display.order": "Display Order",
  "shared.display.order.placeholder": "Enter display order",
  "shared.edit": "Edit",
  "shared.error.bad.request": "Bad Request",
  "shared.error.conflict": "Conflict",
  "shared.error.not.found": "Not Found",
  "shared.error.server.error": "Server Error",
  "shared.error.service.unavailable": "Service Unavailable",
  "shared.error.validation.error": "Validation Error",
  "shared.inactive": "Inactive",
  "shared.invalid.email": "Please enter a valid email address",
  "shared.loading.actions": "Loading actions...",
  "shared.loading.roles": "Loading roles...",
  "shared.min.characters": "Min. {{count}} characters",
  "shared.na": "N/A",
  "shared.name": "Name",
  "shared.name.required": "Name is required",
  "shared.no": "No",
  "shared.no.results": "No results found",
  "shared.not.assigned": "Not Assigned",
  "shared.pending.changes": "Pending Changes",
  "shared.read.only": "Read Only",
  "shared.remove": "Remove",
  "shared.save": "Save",
  "shared.save.changes": "Save Changes",
  "shared.search": "Search",
  "shared.select": "Select...",
  "shared.select.all": "Select All",
  "shared.select.deselect.all": "Select/Deselect All",
  "shared.status": "Status",
  "shared.to.add": "To Add",
  "shared.to.assign": "To Assign",
  "shared.to.remove": "To Remove",
  "shared.to.whitelist": "To Whitelist",
  "shared.type": "Type",
  "shared.unexpected.error": "An unexpected error occurred",
  "shared.unknown": "Unknown",
  "shared.update": "Update",
  "shared.upload": "Upload",
  "shared.validation.required": "{{field}} is required",
  "shared.verified": "Verified",
  "shared.view": "View",
  "shared.view.details": "View Details",
  "shared.yes": "Yes",
  "shared.validation": "Validation",

  // cross-package shared keys (primeng.* — PrimeNG i18n provider)
  "primeng.accept": "Yes",
  "primeng.add.rule": "Add Rule",
  "primeng.apply": "Apply",
  "primeng.aria.cancel.edit": "Cancel Edit",
  "primeng.aria.close": "Close",
  "primeng.aria.collapse.row": "Row Collapsed",
  "primeng.aria.edit.row": "Edit Row",
  "primeng.aria.expand.row": "Row Expanded",
  "primeng.aria.false.label": "False",
  "primeng.aria.filter.constraint": "Filter Constraint",
  "primeng.aria.filter.operator": "Filter Operator",
  "primeng.aria.first.page.label": "First Page",
  "primeng.aria.grid.view": "Grid View",
  "primeng.aria.hide.filter.menu": "Hide Filter Menu",
  "primeng.aria.jump.to.page.dropdown.label": "Jump to Page Dropdown",
  "primeng.aria.jump.to.page.input.label": "Jump to Page Input",
  "primeng.aria.last.page.label": "Last Page",
  "primeng.aria.list.view": "List View",
  "primeng.aria.move.all.to.source": "Move All to Source",
  "primeng.aria.move.all.to.target": "Move All to Target",
  "primeng.aria.move.bottom": "Move Bottom",
  "primeng.aria.move.down": "Move Down",
  "primeng.aria.move.to.source": "Move to Source",
  "primeng.aria.move.to.target": "Move to Target",
  "primeng.aria.move.top": "Move Top",
  "primeng.aria.move.up": "Move Up",
  "primeng.aria.navigation": "Navigation",
  "primeng.aria.next": "Next",
  "primeng.aria.next.page.label": "Next Page",
  "primeng.aria.null.label": "Not Selected",
  "primeng.aria.page.label": "Page {page}",
  "primeng.aria.prev.page.label": "Previous Page",
  "primeng.aria.previous": "Previous",
  "primeng.aria.rotate.left": "Rotate Left",
  "primeng.aria.rotate.right": "Rotate Right",
  "primeng.aria.rows.per.page.label": "Rows per page",
  "primeng.aria.save.edit": "Save Edit",
  "primeng.aria.scroll.top": "Scroll Top",
  "primeng.aria.select.all": "All items selected",
  "primeng.aria.select.row": "Row Selected",
  "primeng.aria.show.filter.menu": "Show Filter Menu",
  "primeng.aria.slide": "Slide",
  "primeng.aria.slide.number": "{slideNumber}",
  "primeng.aria.star": "1 star",
  "primeng.aria.stars": "{star} stars",
  "primeng.aria.true.label": "True",
  "primeng.aria.unselect.all": "All items unselected",
  "primeng.aria.unselect.row": "Row Unselected",
  "primeng.aria.zoom.image": "Zoom Image",
  "primeng.aria.zoom.in": "Zoom In",
  "primeng.aria.zoom.out": "Zoom Out",
  "primeng.cancel": "Cancel",
  "primeng.choose": "Choose",
  "primeng.choose.date": "Choose Date",
  "primeng.clear": "Clear",
  "primeng.contains": "Contains",
  "primeng.date.after": "Date is after",
  "primeng.date.before": "Date is before",
  "primeng.date.is": "Date is",
  "primeng.date.is.not": "Date is not",
  "primeng.empty.filter.message": "No results found",
  "primeng.empty.message": "No results found",
  "primeng.empty.search.message": "No results found",
  "primeng.empty.selection.message": "No selected item",
  "primeng.ends.with": "Ends with",
  "primeng.equals": "Equals",
  "primeng.first.day.of.week": "0",
  "primeng.gt": "Greater than",
  "primeng.gte": "Greater than or equal to",
  "primeng.lt": "Less than",
  "primeng.lte": "Less than or equal to",
  "primeng.match.all": "Match All",
  "primeng.match.any": "Match Any",
  "primeng.no.filter": "No Filter",
  "primeng.not.contains": "Not contains",
  "primeng.not.equals": "Not equals",
  "primeng.pending": "Pending",
  "primeng.reject": "No",
  "primeng.remove.rule": "Remove Rule",
  "primeng.selection.message": "{0} items selected",
  "primeng.starts.with": "Starts with",
  "primeng.today": "Today",
  "primeng.upload": "Upload",
  "primeng.week.header": "Wk",
  "primeng.choose.year": "Choose Year",
  "primeng.choose.month": "Choose Month",
  "primeng.date.format": "mm/dd/yy",
  "primeng.weak": "Weak",
  "primeng.medium": "Medium",
  "primeng.strong": "Strong",
  "primeng.password.prompt": "Enter a password",
  "primeng.country.placeholder": "Choose a country",
};

const LAYOUT_MESSAGES: Record<string, string> = {
  // components/top-bar/app.profile.ts
  "layout.profile.title": "Profile",
  "layout.profile.profile.picture.alt": "Profile picture",
  "layout.profile.copy.sign.up.link": "Copy SignUp Link",
  "layout.profile.logout": "Logout",
  "layout.profile.guest": "Guest",
  "layout.profile.link.copied": "Link Copied",
  "layout.profile.sign.up.link.copied": "Sign Up Link copied.",
  "layout.profile.failed.copy.sign.up.link": "Failed to copy signup link.",

  // components/top-bar/app.launcher.ts
  "layout.launcher.apps": "Apps",
  "layout.launcher.applications": "Applications",

  // components/top-bar/app.company-branch-selector.ts
  "layout.company.branch.selector.title": "Switch Company & Branch",
  "layout.company.branch.selector.select.company": "Select Company",
  "layout.company.branch.selector.branch": "Branch",
  "layout.company.branch.selector.select.branch": "Select Branch",
  "layout.company.branch.selector.switch.button": "Switch",
  "layout.company.branch.selector.no.company": "No Company",
  "layout.company.branch.selector.branch.required": "Branch Required",
  "layout.company.branch.selector.please.select.branch":
    "Please select a branch",

  // components/top-bar/app.searchbar.ts
  "layout.topbar.search": "Search",
  "layout.topbar.search.placeholder": "Search for content...",

  // components/app.topbar.ts
  "layout.topbar.toggle.menu": "Toggle menu",
  "layout.topbar.toggle.dark.mode": "Toggle dark mode",
  "layout.topbar.open.theme.settings": "Open theme settings",
  "layout.topbar.more.options": "More options",

  // components/app.configurator.ts
  "layout.configurator.primary": "Primary",
  "layout.configurator.surface": "Surface",
  "layout.configurator.presets": "Presets",
  "layout.configurator.menu.mode": "Menu Mode",
  "layout.configurator.menu.mode.static": "Static",
  "layout.configurator.menu.mode.overlay": "Overlay",
  "layout.configurator.menu.mode.topbar": "Topbar",

  // components/app.footer.ts
  "layout.footer.by": "by",

  // app-menu.config.ts (main app menu configuration)
  "menu.dashboard": "Dashboard",
  "menu.administration": "Administration",
  "menu.iam": "IAM",
  "menu.storage": "Storage",
  "menu.forms": "Forms",
  "menu.email": "Email",
  "menu.event.manager": "Event Manager",
  "menu.notifications": "Notifications",
  "menu.localization": "Localization",

  // Those are layout part from notification module, but we put them here to avoid circular dependency between layout and notification module

  // components/notification-bell/notification-bell.component.ts
  "notification.title": "Notifications",

  // components/notification-list/notification-list.component.ts
  "notification.mark.all.read": "Mark all read",
  "notification.view.all": "View all notifications",
  "notification.empty": "No notifications",

  // components/notification-item/notification-item.component.ts
  "notification.time.just.now": "Just now",
  "notification.time.minutes.ago": "{{count}}m ago",
  "notification.time.hours.ago": "{{count}}h ago",
  "notification.time.days.ago": "{{count}}d ago",
};

const AUTH_MESSAGES: Record<string, string> = {
  // AUTH_MESSAGES (API keys)
  "auth.login.success": "Login successful",
  "auth.login.requires.selection":
    "Please select a company and branch to continue",
  "auth.login.invalid.credentials": "Invalid email or password",
  "auth.login.email.not.verified": "Please verify your email before logging in",
  "auth.login.account.deactivated": "Your account has been deactivated",
  "auth.logout.success": "Logged out successfully",
  "auth.register.success": "Account created successfully",
  "auth.register.failed": "Registration failed. Please try again.",
  "auth.refresh.success": "Token refreshed successfully",
  "auth.me.success": "User info retrieved successfully",
  "auth.select.success": "Company selected successfully",
  "auth.switch.company.success": "Company switched successfully",
  "auth.register.email.exists": "Email already exists",
  "auth.register.company.already.assigned": "Company already assigned",
  "auth.password.change.success": "Password changed successfully",
  "auth.password.change.invalid.current": "Current password is incorrect",
  "auth.password.change.current.required": "Current password is required",
  "auth.password.reset.email.sent": "Password reset email sent",
  "auth.password.reset.success": "Password reset successfully",
  "auth.token.expired": "Token has expired",
  "auth.token.revoked": "Token has been revoked",
  "auth.token.too.large": "Refresh token too large (≈{{size}} bytes)",
  "auth.company.list.success": "User companies retrieved successfully",
  "auth.company.not.found": "Company not found",
  "auth.company.required": "Company is required",
  "auth.company.feature.not.enabled":
    "This feature is not enabled for your company",
  "auth.branch.list.success": "Company branches retrieved successfully",
  "auth.branch.no.access": "No access to this branch",
  "auth.branch.not.found": "Branch not found",
  "auth.email.not.configured": "Email service is not configured",
  "auth.email.send.failed": "Failed to send email",
  "auth.session.invalid": "Invalid session. Please login again.",
  "auth.session.not.available": "Session not available",
  "auth.profile.access.denied": "Access to profile denied",
  "auth.profile.sections.not.supported": "Profile sections not supported",
  "auth.logout.service.unavailable": "Logout service unavailable",
  "auth.password.reset.token.expired": "Password reset token has expired",
  "auth.password.reset.token.used":
    "Password reset token has already been used",

  // EMAIL_VERIFICATION_MESSAGES (API keys)
  "email.verification.sent": "Verification email sent",
  "email.verification.success": "Email verified successfully",
  "email.verification.token.invalid": "Invalid verification token",
  "email.verification.token.expired": "Verification token has expired",
  "email.verification.not.enabled": "Email verification is not enabled",
  "email.verification.resend.success": "Verification email resent successfully",

  // === UI KEYS — AUTH DOMAIN (AUTH_ROUTES: login, register, forgot-password, reset-password, verify-email) ===

  // interceptors/token-refresh.interceptor.ts
  "auth.session.expired.title": "Session Expired",

  // pages/login/login-page.component.ts
  "auth.login.welcome": "Welcome back!",
  "auth.login.sign.in.to.continue": "Sign in to continue to your account",
  "auth.email.label": "Email Address",
  "auth.email.placeholder": "Enter email address",
  "auth.password.label": "Password",
  "auth.password.placeholder": "Enter your password",
  "auth.field.remember.me": "Remember me",
  "auth.password.forgot": "Forgot Password?",
  "auth.login.sign.in": "Sign In",
  "auth.login.no.account": "Don't have an account?",
  "auth.login.sign.up": "Sign Up",
  "auth.login.verify.email.message": "Please verify your email !",
  "auth.verify.resend": "Resend Verification Email",
  "auth.login.back.to.sign.in": "Back to Sign In",
  "auth.login.select.company": "Select Company",
  "auth.login.select.company.message":
    "Please select a company and branch to continue",
  "auth.login.select.company.option": "Select a company",
  "auth.login.branch.label": "Branch",
  "auth.login.select.branch.option": "Select a branch",
  "auth.login.remember.selection": "Remember my selection",
  "auth.validation.password.min.length":
    "Password must be at least 8 characters",
  "auth.validation.email.required": "Email is required",
  "auth.validation.password.required": "Password is required",
  "auth.validation.password.max.length": "Password exceeds maximum length",
  "auth.validation.password.pattern": "Password does not meet requirements",
  "auth.validation.password.require.uppercase":
    "Password must contain at least one uppercase letter",
  "auth.validation.password.require.lowercase":
    "Password must contain at least one lowercase letter",
  "auth.validation.password.require.number":
    "Password must contain at least one number",
  "auth.validation.password.require.special":
    "Password must contain at least one special character",
  "auth.validation.company.required": "Please select a company",
  "auth.validation.branch.required": "Please select a branch",
  "auth.login.title": "Login",
  "auth.session.expired": "Your session has expired. Please login again.",

  // pages/forgot-password/forgot-password-page.component.ts
  "auth.forgot.password.title": "Forgot Password",
  "auth.forgot.password.subtitle":
    "Enter your email address and we will send you a reset link.",
  "auth.forgot.password.send.reset.link": "Send Reset Link",
  "auth.forgot.password.remember.password": "Remember your password?",
  "auth.forgot.password.check.email": "Check Your Email",
  "auth.forgot.password.email.sent.to":
    "We sent a password reset link to {{email}}",
  "auth.forgot.password.didnt.receive": "Didn't receive the email?",
  "auth.forgot.password.try.again": "Try Again",

  // pages/register/register-page.component.ts
  "auth.register.create.account": "Create Account",
  "auth.register.subtitle": "Fill in your details to create an account.",
  "auth.register.full.name": "Full Name",
  "auth.register.name.placeholder": "Enter your full name",
  "auth.phone.label": "Phone Number",
  "auth.phone.placeholder": "Enter phone number",
  "auth.register.confirm.password": "Confirm Password",
  "auth.register.confirm.password.placeholder": "Confirm your password",
  "auth.register.passwords.do.not.match": "Passwords do not match",
  "auth.register.company.details": "Company Details",
  "auth.register.join.default.company": "Join Default Company",
  "auth.register.join.or.create.company": "Join or Create Company",
  "auth.register.create.new.company": "Create New Company",
  "auth.register.company.code": "Company Code",
  "auth.register.preconfigured.company": "Pre-configured Company",
  "auth.register.company.code.placeholder": "Enter company code",
  "auth.register.enter.company.code": "Enter company code to join",
  "auth.register.branch.code": "Branch Code",
  "auth.register.preconfigured.branch": "Pre-configured Branch",
  "auth.register.branch.code.placeholder": "Enter branch code",
  "auth.register.company.name": "Company Name",
  "auth.register.company.name.placeholder": "Enter company name",
  "auth.address.label": "Address",
  "auth.address.placeholder": "Enter address",
  "auth.register.already.have.account": "Already have an account?",
  "auth.validation.name.min.length": "Name must be at least {{min}} characters",
  "auth.validation.confirm.password.required": "Please confirm your password",

  // pages/verify-email/verify-email-page.component.ts
  "auth.verify.email.verifying": "Verifying Email",
  "auth.verify.email.please.wait":
    "Please wait while we verify your email address...",
  "auth.verify.email.success": "Email Verified",
  "auth.verify.email.success.message":
    "Your email has been verified successfully. You can now login to your account.",
  "auth.verify.email.failed": "Verification Failed",
  "auth.verify.email.invalid.link":
    "This verification link is invalid or has expired.",
  "auth.verify.email.resend.email": "Resend Verification Email",
  "auth.verify.email.resend.title": "Resend Verification",
  "auth.verify.email.resend.subtitle":
    "Enter your email to receive a new verification link.",
  "auth.verify.email.resend": "Resend Email",
  "auth.verify.email.sent": "Verification email sent. Please check your inbox.",

  // pages/reset-password/reset-password-page.component.ts
  "auth.reset.password.title": "Reset Password",
  "auth.reset.password.subtitle": "Enter your new password below.",
  "auth.reset.password.new.password": "New Password",
  "auth.reset.password.new.password.placeholder": "Enter your new password",
  "auth.reset.password.confirm.password": "Confirm Password",
  "auth.reset.password.confirm.password.placeholder":
    "Confirm your new password",
  "auth.reset.password.reset.password": "Reset Password",
  "auth.reset.password.success": "Password Reset Successful",
  "auth.reset.password.success.message":
    "Your password has been reset successfully. You can now login with your new password.",
  "auth.reset.password.invalid.link": "Invalid Reset Link",
  "auth.reset.password.invalid.link.message":
    "This password reset link is invalid or has expired.",
  "auth.reset.password.request.new.link": "Request New Link",
};

const ADMINISTRATIVE_MESSAGES: Record<string, string> = {
  // User CRUD messages (API keys)
  "user.create.success": "User created successfully",
  "user.create.many.success": "{{count}} users created successfully",
  "user.get.success": "User retrieved successfully",
  "user.get.by.ids.success": "Users retrieved successfully by Ids",
  "user.update.success": "User updated successfully",
  "user.update.many.success": "{{count}} users updated successfully",
  "user.get.by.filter.success": "Users retrieved successfully by filter",
  "user.get.all.success": "Users retrieved successfully",
  "user.delete.success": "User deleted successfully",
  "user.restore.success": "User restored successfully",
  "user.not.found": "User not found",
  "user.profile.update.success": "Profile updated successfully",
  "user.profile.extras.success": "Profile extras retrieved successfully",
  "user.profile.sections.success": "Profile sections retrieved successfully",
  "user.profile.section.data.success":
    "Profile section data retrieved successfully",
  "user.profile.section.update.success": "Profile section updated successfully",
  "user.profile.completion.success":
    "Profile completion retrieved successfully",
  "user.email.verify.success": "Email verified successfully",
  "user.phone.verify.success": "Phone verified successfully",
  "user.status.update.success": "User status updated successfully",

  // Company CRUD messages (API keys)
  "company.create.success": "Company created successfully",
  "company.create.many.success": "{{count}} companies created successfully",
  "company.get.success": "Company retrieved successfully",
  "company.get.by.ids.success": "Companies retrieved successfully by Ids",
  "company.get.by.filter.success": "Companies retrieved successfully by filter",
  "company.update.success": "Company updated successfully",
  "company.update.many.success": "{{count}} companies updated successfully",
  "company.get.all.success": "Companies retrieved successfully",
  "company.delete.success": "Company deleted successfully",
  "company.restore.success": "Company restored successfully",

  // Branch CRUD messages (API keys)
  "branch.create.success": "Branch created successfully",
  "branch.create.many.success": "{{count}} branches created successfully",
  "branch.get.success": "Branch retrieved successfully",
  "branch.get.by.ids.success": "Branches retrieved successfully by Ids",
  "branch.get.by.filter.success": "Branches retrieved successfully by filter",
  "branch.update.success": "Branch updated successfully",
  "branch.update.many.success": "{{count}} branches updated successfully",
  "branch.get.all.success": "Branches retrieved successfully",
  "branch.delete.success": "Branch deleted successfully",
  "branch.restore.success": "Branch restored successfully",

  // USER_PERMISSION_MESSAGES (API keys)
  "user.permission.company.list.success":
    "User companies retrieved successfully",
  "user.permission.branch.list.success": "User branches retrieved successfully",
  "user.permission.batch.success":
    "Processed {{added}} additions and {{removed}} removals",
  "user.permission.already.assigned": "User already assigned to this {{type}}",
  "user.permission.not.found": "{{type}} permission not found",

  // === UI KEYS — ADMINISTRATIVE DOMAIN (ADMINISTRATION_ROUTES: users, company, branch) ===
  // components/user-company-permission-dialog.component.ts
  "administrative.permission.manage.company": "Manage Company Permissions",
  "administrative.permission.user": "User",
  "administrative.company.no.companies": "No companies found",

  // components/user-branch-permission-dialog.component.ts
  "administrative.permission.manage.branch": "Manage Branch Permissions",
  "administrative.company.select": "Select Company",
  "administrative.permission.no.company":
    "This user has no company permissions assigned.",
  "administrative.permission.assign.company.first":
    "Assign company permissions first before managing branch access.",
  "administrative.permission.select.company.for.branches":
    "Please select a company to view branches.",
  "administrative.branch.no.branches": "No branches found",

  // pages/administration/administration-page.component.ts
  "administrative.title": "Administration",
  "administrative.subtitle": "Manage users, companies, and branches",
  "administrative.user.title": "Users",
  "administrative.company.title": "Companies",
  "administrative.branch.title": "Branches",

  // pages/branch/branch-form.component.ts
  "administrative.branch.new": "New Branch",
  "administrative.branch.edit": "Edit Branch",
  "administrative.branch.name": "Branch Name",
  "administrative.branch.name.placeholder": "Enter branch name",
  "administrative.branch.slug": "Branch Slug",
  "administrative.branch.slug.placeholder": "Enter branch slug",
  "administrative.email.label": "Email",
  "administrative.email.placeholder": "Enter email address",
  "administrative.phone.label": "Phone",
  "administrative.phone.placeholder": "Enter phone number",
  "administrative.address.label": "Address",
  "administrative.address.placeholder": "Enter address",
  "administrative.branch.slug.required": "Branch slug is required",

  // pages/branch/branch-list.component.ts
  "administrative.branch.add": "Add Branch",
  "administrative.branch.select.company.first": "Please select a company first",
  "administrative.branch.delete.title": "Delete Branch",

  // pages/company/company-form.component.ts
  "administrative.company.edit": "Edit Company",
  "administrative.company.new": "New Company",
  "administrative.company.name": "Company Name",
  "administrative.company.name.placeholder": "Enter company name",
  "administrative.company.slug": "Company Slug",
  "administrative.company.slug.placeholder": "Enter company slug",
  "administrative.company.website": "Website",
  "administrative.company.website.placeholder": "Enter website URL",
  "administrative.company.slug.required": "Company slug is required",

  // pages/company/company-list.component.ts
  "administrative.company.add": "Add Company",
  "administrative.branch.view.branches": "View Branches",
  "administrative.company.delete.title": "Delete Company",

  // pages/users/user-form.component.ts
  "administrative.user.edit": "Edit User",
  "administrative.user.new": "New User",
  "administrative.user.name": "Name",
  "administrative.user.name.placeholder": "Enter full name",
  "administrative.user.password": "Password",
  "administrative.user.password.optional": "(leave blank to keep current)",
  "administrative.user.password.placeholder": "Enter password",
  "administrative.user.email.verified": "Email Verified",
  "administrative.user.auto.assign.to":
    "New user will be automatically assigned to",

  // pages/users/user-list.component.ts
  "administrative.user.add": "Add User",
  "administrative.permission.company.permissions": "Company Permissions",
  "administrative.permission.branch.permissions": "Branch Permissions",
  "administrative.user.no.users": "No users found",
  "administrative.user.details": "User Details",
  "administrative.user.delete.title": "Delete User",
};

const PROFILE_MESSAGES: Record<string, string> = {
  // === UI KEYS — PROFILE DOMAIN (PROFILE_ROUTES) ===

  // pages/profile/profile-page.component.ts
  "profile.title": "Profile",
  "profile.subtitle": "Manage your account settings and preferences.",
  "profile.storage.not.enabled":
    "Profile picture upload is not available. Storage service is not configured.",
  "profile.name.label": "Full Name",
  "profile.name.placeholder": "Enter your full name",
  "profile.phone.label": "Phone",
  "profile.phone.placeholder": "Enter phone number",
  "profile.additional.info": "Additional Information",
  "profile.employment.info": "Employment Information",
  "profile.managed.by.admin": "This field is managed by an administrator.",
  "profile.security": "Security",
  "profile.current.password": "Current Password",
  "profile.current.password.placeholder": "Enter current password",
  "profile.new.password": "New Password",
  "profile.confirm.password": "Confirm New Password",
  "profile.confirm.password.placeholder": "Confirm new password",
  "profile.change.password": "Change Password",
  "profile.company.branch": "Company & Branch",
  "profile.branch.label": "Branch",
  "profile.actions.label": "Direct Actions",
  "profile.actions.none.assigned": "No actions assigned",
  "profile.permissions.label": "My Permissions",
  "profile.roles.label": "Roles",
  "profile.roles.none.assigned": "No roles assigned",
};

const IAM_MESSAGES: Record<string, string> = {
  // Action CRUD (API keys)
  "action.create.success": "Action created successfully",
  "action.create.many.success": "{{count}} actions created successfully",
  "action.get.success": "Action retrieved successfully",
  "action.get.by.ids.success": "Actions retrieved successfully by Ids",
  "action.get.by.filter.success": "Actions retrieved successfully by filter",
  "action.get.all.success": "Actions retrieved successfully",
  "action.update.success": "Action updated successfully",
  "action.update.many.success": "{{count}} actions updated successfully",
  "action.delete.success": "Action deleted successfully",
  "action.restore.success": "Action restored successfully",

  // Role CRUD (API keys)
  "role.create.success": "Role created successfully",
  "role.create.many.success": "{{count}} roles created successfully",
  "role.get.success": "Role retrieved successfully",
  "role.get.by.ids.success": "Roles retrieved successfully by Ids",
  "role.get.by.filter.success": "Roles retrieved successfully by filter",
  "role.get.all.success": "Roles retrieved successfully",
  "role.update.success": "Role updated successfully",
  "role.update.many.success": "{{count}} roles updated successfully",
  "role.delete.success": "Role deleted successfully",
  "role.restore.success": "Role restored successfully",

  // PERMISSION_OPERATION_MESSAGES (API keys)
  "permission.process.success":
    "Successfully processed {{total}} items: {{added}} added, {{removed}} removed",
  "permission.user.required": "User is required for {{method}}",
  "permission.already.exists": "Permission already exists",

  // ROLE_PERMISSION_MESSAGES (API keys)
  "role.permission.actions.success": "Role actions retrieved successfully",
  "role.permission.user.roles.success": "User roles retrieved successfully",

  // USER_ACTION_PERMISSION_MESSAGES (API keys)
  "user.action.permission.get.success":
    "User action permissions retrieved successfully",

  // COMPANY_ACTION_PERMISSION_MESSAGES (API keys)
  "company.action.permission.get.success":
    "Company action permissions retrieved successfully",

  // MY_PERMISSION_MESSAGES (API keys)
  "my.permission.get.success": "Permissions loaded successfully",

  // IAM_MODE_MESSAGES (API keys)
  "iam.direct.mode.unavailable":
    "Direct permission assignment not available in RBAC-only mode",
  "iam.rbac.mode.unavailable":
    "Role-based permission assignment not available in direct-only mode",
  "iam.role.assignment.unavailable":
    "Role assignment not available in direct-only mode",

  // pages/iam-container/iam-container.component.ts
  "iam.title": "Identity & Access Management",
  "iam.subtitle": "Manage roles, permissions, and access control",
  "iam.action.title": "Actions",
  "iam.role.title": "Roles",
  "iam.permission.title": "Permissions",

  // pages/action/action-list-page.component.ts
  "iam.action.new": "New Action",
  "iam.action.name": "Action Name",
  "iam.action.code": "Action Code",
  "iam.action.type": "Type",
  "iam.action.no.actions": "No actions found",
  "iam.action.type.backend": "Backend",
  "iam.action.type.frontend": "Frontend",
  "iam.action.type.both": "Both",
  "iam.action.delete.title": "Delete Action",

  // pages/action/action-form-page.component.ts
  "iam.action.edit": "Edit Action",
  "iam.action.name.placeholder": "Enter action name",
  "iam.action.code.placeholder": "Enter action code",
  "iam.action.parent": "Parent Action",
  "iam.action.select.parent": "Select Parent Action",
  "iam.action.type.backend.label": "Backend Only",
  "iam.action.type.frontend.label": "Frontend Only",
  "iam.action.type.both.label": "Backend & Frontend",

  // pages/role/role-list-page.component.ts
  "iam.company.title": "Companies",
  "iam.role.new": "New Role",
  "iam.role.name": "Role Name",
  "iam.role.no.roles": "No roles found",
  "iam.role.delete.title": "Delete Role",

  // pages/role/role-form-page.component.ts
  "iam.role.edit": "Edit Role",
  "iam.role.name.placeholder": "Enter role name",

  // pages/permission/permission-page.component.ts
  "iam.permission.role.actions": "Role Actions",
  "iam.permission.user.roles": "User Roles",
  "iam.permission.user.actions": "User Actions",
  "iam.permission.company.actions": "Company Actions",

  // components/logic-builder.component.ts
  "iam.logic.title": "Permission Logic",
  "iam.logic.add.logic": "Add Logic",
  "iam.logic.clear.logic": "Clear Logic",
  "iam.logic.description":
    "Define permission requirements using AND/OR logic with actions",
  "iam.logic.click.to.toggle": "Click to toggle",
  "iam.logic.conditions": "{{count}} conditions",
  "iam.logic.select.action": "Select Action...",
  "iam.logic.actions.available": "{{count}} available",
  "iam.logic.add.condition": "Add Condition:",
  "iam.logic.group": "Group",
  "iam.logic.action": "Action",

  // components/role-action-selector.component.ts
  "iam.permission.select.role": "Select Role",
  "iam.permission.select.role.placeholder": "Search and select a role",
  "iam.permission.action.permissions": "Action Permissions",
  "iam.permission.actions.available": "{{count}} actions available",
  "iam.validation.warning.title": "Validation Warning",
  "iam.validation.unmet.prerequisites.plural":
    "{{count}} selected actions have unmet prerequisites. Fix before saving or use auto-fix on save.",
  "iam.validation.unmet.prerequisites.singular":
    "{{count}} selected action has unmet prerequisites. Fix before saving or use auto-fix on save.",
  "iam.permission.requirements": "Requirements",
  "iam.validation.unmet.prerequisites.tooltip":
    "This action has unmet prerequisites and will fail validation on save",
  "iam.permission.has.prerequisites": "Has prerequisites",
  "iam.permission.no.actions.available": "No actions available",
  "iam.permission.no.actions.for.role": "No actions available for this role",
  "iam.tooltip.remove.action": "Click to remove",
  "iam.tooltip.add.action": "Click to add (auto-selects required)",
  "iam.tooltip.assigned.to.role": "Assigned to role",
  "iam.tooltip.click.to.remove.role": "Click to remove",
  "iam.tooltip.click.to.assign.role": "Click to assign to role",

  // components/user-action-selector.component.ts
  "iam.permission.select.user": "Select User",
  "iam.permission.select.user.placeholder": "Search and select a user",
  "iam.permission.select.branch": "Select Branch",
  "iam.permission.select.branch.placeholder": "Search and select a branch",
  "iam.branch.permitted.count.plural":
    "{{count}} permitted branches in current company",
  "iam.branch.permitted.count": "{{count}} permitted branch in current company",
  "iam.permission.direct.action.permissions": "Direct Action Permissions",
  "iam.permission.no.actions.for.user": "No actions available for this user",
  "iam.tooltip.assigned.to.user": "Assigned to user",
  "iam.tooltip.click.to.remove.user": "Click to remove direct permission",
  "iam.tooltip.click.to.assign.user": "Click to assign direct permission",
  "iam.permission.company.required": "Please select a company first",

  // components/company-action-selector.component.ts
  "iam.permission.select.company": "Select Company",
  "iam.permission.select.company.placeholder": "Search and select a company",
  "iam.permission.action.whitelist": "Action Whitelist",
  "iam.permission.no.actions.for.company":
    "No actions available for this company",
  "iam.tooltip.selected": "Selected",
  "iam.tooltip.click.to.remove": "Click to remove from company whitelist",
  "iam.tooltip.click.to.add": "Click to add to company whitelist",
  "iam.permission.requires": "requires",
  "iam.permission.prerequisite.validation.failed":
    "Prerequisite Validation Failed",
  "iam.permission.prerequisite.error.message":
    "The following actions have unmet prerequisites:",
  "iam.permission.auto.select.required": "Auto-select Required",
  "iam.permission.actions.selected": "Actions Selected",
  "iam.permission.auto.selected.prerequisites":
    "Required prerequisites have been auto-selected. Click Save to apply changes.",
  "iam.permission.changes.reverted": "Changes Reverted",
  "iam.permission.selection.reverted":
    "Selection has been reverted to the initial state.",

  // components/user-role-selector.component.ts
  "iam.permission.role.assignments": "Role Assignments",
  "iam.permission.roles.available": "{{count}} roles available",
  "iam.pagination.roles.template":
    "Showing {first} to {last} of {totalRecords} roles",
  "iam.permission.no.roles.available": "No roles available",
  "iam.permission.no.roles.for.user": "No roles available for this user",
  "iam.tooltip.click.to.remove.role.from.user": "Click to remove role",
  "iam.tooltip.click.to.assign.role.to.user": "Click to assign role to user",

  // services/action-permission-logic.service.ts
  "iam.logic.unknown.action": "Unknown Action",
  "iam.logic.validation.failed": "Validation Failed",
  "iam.logic.validation.failed.message":
    "The following actions have unmet prerequisites:",
  "iam.logic.validation.failed.prompt": "Would you like to:",
  "iam.logic.auto.fix": "Auto-fix (Remove Invalid)",
  "iam.logic.invalid.actions.removed": "Invalid Actions Removed",
  "iam.logic.removed.actions.detail":
    "Removed {{count}} action(s) with unmet prerequisites. You can now save.",
  "iam.logic.save.cancelled": "Save Cancelled",
  "iam.logic.fix.prerequisites.manually":
    "Please fix the prerequisites manually before saving",
  "iam.logic.prerequisites.satisfied": "[OK] Prerequisites Satisfied",
  "iam.logic.all.required.selected":
    "All required actions are already selected.\nYou can safely add this action.",
  "iam.logic.prerequisites.required":
    "Prerequisites Required ({{count}} missing)",
  "iam.logic.click.to.auto.select": "Click to auto-select required actions",
  "iam.logic.select.action.label": "Select Action",
  "iam.logic.auto.select.actions": "Auto-select Actions",
  "iam.logic.action.selected.detail":
    "Action selected successfully (prerequisites already satisfied)",
  "iam.logic.auto.selected.detail":
    "Automatically selected {{count}} action(s) including prerequisites",
  "iam.logic.minimum.required": " (minimum required)",
  "iam.logic.auto.select.prompt":
    "Auto-select will choose {{count}} action(s){{suffix}}.",
  "iam.logic.missing.prerequisites": "Missing Prerequisites",
  "iam.logic.requires.conditions":
    "requires the following conditions to be satisfied:",
  "iam.logic.would.you.continue": "Would you like to continue?",
  "iam.logic.actions.selected.summary": "Actions Selected",
  "iam.logic.selection.cancelled": "Selection Cancelled",
  "iam.logic.action.not.added": "Action not added to whitelist",
  "iam.logic.required.by.actions": "is required by the following action(s):",
  "iam.logic.alternatives.available": "Alternative options available:",
  "iam.logic.switch.to.alternatives":
    "Would you like to automatically switch to alternatives?",
  "iam.logic.remove.dependents":
    "Removing this will also remove the dependent action(s).",
  "iam.logic.dependency.warning": "Dependency Warning",
  "iam.logic.use.alternatives": "Use Alternatives",
  "iam.logic.remove.all": "Remove All",
  "iam.logic.alternatives.applied": "Alternatives Applied",
  "iam.logic.switched.to.alternatives":
    "Automatically switched to alternative action(s)",
  "iam.logic.actions.removed": "Actions Removed",
  "iam.logic.removed.with.dependents":
    "Removed {{name}} and {{count}} dependent action(s)",
  "iam.logic.cancelled": "Cancelled",
  "iam.logic.no.changes.made": "No changes made",
  "iam.logic.satisfied": "(satisfied)",
  "iam.logic.missing": "(missing)",
  "iam.logic.invalid.node": "Invalid logic node",
  "iam.logic.invalid": "(invalid)",
};

const STORAGE_MESSAGES: Record<string, string> = {
  // File entity CRUD (API keys)
  "file.create.success": "File created successfully",
  "file.create.many.success": "{{count}} files created successfully",
  "file.get.success": "File retrieved successfully",
  "file.get.by.ids.success": "Files retrieved successfully by Ids",
  "file.get.by.filter.success": "Files retrieved successfully by filter",
  "file.get.all.success": "Files retrieved successfully",
  "file.update.success": "File updated successfully",
  "file.update.many.success": "{{count}} files updated successfully",
  "file.delete.success": "File deleted successfully",
  "file.restore.success": "File restored successfully",
  "file.not.found": "File not found",

  // Folder entity CRUD (API keys)
  "folder.create.success": "Folder created successfully",
  "folder.create.many.success": "{{count}} folders created successfully",
  "folder.get.success": "Folder retrieved successfully",
  "folder.get.by.ids.success": "Folders retrieved successfully by Ids",
  "folder.get.by.filter.success": "Folders retrieved successfully by filter",
  "folder.get.all.success": "Folders retrieved successfully",
  "folder.update.success": "Folder updated successfully",
  "folder.update.many.success": "{{count}} folders updated successfully",
  "folder.delete.success": "Folder deleted successfully",
  "folder.restore.success": "Folder restored successfully",
  "folder.not.found": "Folder not found",

  // Storage config CRUD (API keys)
  "storage.config.create.success": "Storage configuration created successfully",
  "storage.config.create.many.success":
    "{{count}} storage configurations created successfully",
  "storage.config.get.success": "Storage configuration retrieved successfully",
  "storage.config.get.by.ids.success":
    "Storage configurations retrieved successfully by Ids",
  "storage.config.get.by.filter.success":
    "Storage configurations retrieved successfully by filter",
  "storage.config.get.all.success":
    "Storage configurations retrieved successfully",
  "storage.config.update.success": "Storage configuration updated successfully",
  "storage.config.update.many.success":
    "{{count}} storage configurations updated successfully",
  "storage.config.delete.success": "Storage configuration deleted successfully",
  "storage.config.restore.success":
    "Storage configuration restored successfully",

  // Upload (API keys)
  "upload.success": "File uploaded successfully",
  "upload.many.success": "Files uploaded successfully",
  "upload.file.too.large":
    "File size ({{fileSize}}MB) exceeds maximum {{maxSize}}MB",
  "upload.invalid.type":
    'File type "{{mimeType}}" not allowed. Allowed: {{allowedTypes}}',
  "upload.no.files.provided": "No files provided",
  "upload.no.file.path": "File path is required",
  "upload.invalid.file.path": "Invalid file path",
  "upload.config.not.found": "Upload configuration not found",

  // pages/storage-container/storage-container.component.ts
  "storage.title": "Storage",
  "storage.subtitle": "Manage files, folders, and storage configurations",
  "storage.file.title": "Files",
  "storage.folder.title": "Folder Setup",
  "storage.config.title": "Storage Configurations",

  // pages/storage-config/storage-config-list.component.ts
  "storage.button.new.configuration": "New Configuration",
  "storage.table.provider": "Provider",
  "storage.table.created": "Created",
  "storage.empty.configs.in.company":
    "No storage configurations found in current company",
  "storage.empty.configs": "No storage configurations found",
  "storage.config.load.failed": "Failed to load storage configurations",
  "storage.config.delete.title": "Delete Configuration",

  // pages/storage-config/storage-config-form.component.ts
  "storage.config.edit.config": "Edit Storage Configuration",
  "storage.config.new.config": "New Configuration",
  "storage.config.config.name.required": "Configuration Name *",
  "storage.config.config.name.placeholder": "e.g., Production AWS S3",
  "storage.config.provider.required": "Storage Provider *",
  "storage.set.as.default": "Set as Default",
  "storage.aws.title": "AWS S3 Configuration",
  "storage.config.region.required": "AWS Region *",
  "storage.aws.region.placeholder": "us-east-1",
  "storage.config.bucket.required": "Bucket Name *",
  "storage.aws.bucket.placeholder": "my-bucket",
  "storage.config.access.key.required": "Access Key ID *",
  "storage.config.secret.key.required": "Secret Access Key *",
  "storage.config.endpoint.optional": "Custom Endpoint (Optional)",
  "storage.config.endpoint.placeholder": "https://s3.custom-endpoint.com",
  "storage.azure.title": "Azure Blob Configuration",
  "storage.azure.account.name.required": "Account Name *",
  "storage.azure.container.name.required": "Container Name *",
  "storage.azure.account.key.required": "Account Key *",
  "storage.sftp.title": "SFTP Configuration",
  "storage.sftp.host.required": "Host *",
  "storage.sftp.host.placeholder": "sftp.example.com",
  "storage.sftp.port.required": "Port *",
  "storage.sftp.port.placeholder": "22",
  "storage.sftp.username.required": "Username *",
  "storage.sftp.password.required": "Password *",
  "storage.sftp.base.path.required": "Base Path *",
  "storage.sftp.base.path.placeholder": "/uploads",
  "storage.local.title": "Local Storage Configuration",
  "storage.local.base.path.required": "Base Path *",
  "storage.local.base.path.placeholder": "/var/www/uploads",
  "storage.config.endpoint": "Endpoint URL",
  "storage.validation.config.name.required": "Configuration name is required",

  // pages/file-manager/file-manager-list.component.ts
  "storage.file.manager.title": "File Manager",
  "storage.button.upload.file": "Upload File",
  "storage.table.size": "Size",
  "storage.table.location": "Location",
  "storage.table.config": "Config",
  "storage.table.private": "Private",
  "storage.private": "Private",
  "storage.public": "Public",
  "storage.tooltip.trash": "Trash",
  "storage.empty.files.in.company": "No files found in current company",
  "storage.empty.files": "No files found",
  "storage.file.url.not.available": "File URL is not available",
  "storage.delete.move.to.trash.confirm":
    'Move "{{name}}" to trash? You can recover it later.',
  "storage.delete.move.to.trash": "Move to Trash",
  "storage.delete.permanent.delete.confirm":
    'Permanently delete "{{name}}"? This action CANNOT be undone and will delete the file from storage.',
  "storage.delete.permanent.delete": "Permanent Delete",
  "storage.delete.permanent.delete.button": "Delete Permanently",

  // pages/file-manager/file-manager-form.component.ts
  "storage.file.manager.edit.file": "Edit File",
  "storage.file.manager.upload.file": "Upload File",
  "storage.config.select.config": "Select storage configuration...",
  "storage.config.no.configs":
    "No storage configurations found. Please create one first.",
  "storage.folder.optional": "Folder (Optional)",
  "storage.folder.no.folder": "No folder (root level)",
  "storage.folder.no.folders.available":
    "No folders available. File will be uploaded to root level.",
  "storage.folder.no.folders.edit": "No folders available.",
  "storage.file.select.required": "Select File *",
  "storage.button.choose.file": "Choose File",
  "storage.upload.drag.drop": "Drag and drop file here or click to browse",
  "storage.upload.max.size": "Maximum file size: {{size}}",
  "storage.upload.please.select": "Please select a file to upload",
  "storage.file.name.required": "File Name *",
  "storage.file.placeholder.edit": "Enter file name",
  "storage.file.placeholder": "Will be auto-filled from selected file",
  "storage.file.private": "Private File",
  "storage.file.private.hint": "Only users with permission can access",
  "storage.file.public.hint": "File is publicly accessible",
  "storage.validation.file.name.required": "File name is required",
  "storage.error.no.file": "Please select a file",
  "storage.error.no.config": "Please select a storage configuration",
  "storage.upload.failed": "Failed to upload file",

  // pages/folder/folder-list.component.ts
  "storage.button.new.folder": "New Folder",
  "storage.table.slug": "Slug",
  "storage.empty.folders.in.company": "No folders found in current company",
  "storage.empty.folders": "No folders found",
  "storage.folder.delete.title": "Delete Folder",

  // pages/folder/folder-form.component.ts
  "storage.folder.edit.folder": "Edit Folder",
  "storage.folder.new.folder": "New Folder",
  "storage.folder.name.required": "Folder Name *",
  "storage.folder.name.placeholder": "Enter folder name",
  "storage.validation.folder.name.required": "Folder name is required",

  // utils/base-storage-page.ts
  "storage.delete.this.item": "this item",

  // utils/storage-utils.ts
  "storage.size.bytes": "Bytes",
  "storage.size.gb": "GB",
};

const EMAIL_MESSAGES: Record<string, string> = {
  // Email config CRUD (API keys)
  "email.config.create.success": "Email configuration created successfully",
  "email.config.create.many.success":
    "{{count}} email configurations created successfully",
  "email.config.get.success": "Email configuration retrieved successfully",
  "email.config.get.all.success": "Email configurations retrieved successfully",
  "email.config.get.by.ids.success":
    "Email configurations retrieved successfully by Ids",
  "email.config.get.by.filter.success":
    "Email configurations retrieved successfully by filter",
  "email.config.update.success": "Email configuration updated successfully",
  "email.config.update.many.success":
    "{{count}} email configurations updated successfully",
  "email.config.delete.success": "Email configuration deleted successfully",
  "email.config.restore.success": "Email configuration restored successfully",

  // Email template CRUD (API keys)
  "email.template.create.success": "Email template created successfully",
  "email.template.update.success": "Email template updated successfully",
  "email.template.delete.success": "Email template deleted successfully",
  "email.template.get.success": "Email template retrieved successfully",
  "email.template.get.by.ids.success":
    "Email templates retrieved successfully by Ids",
  "email.template.get.by.filter.success":
    "Email templates retrieved successfully by filter",
  "email.template.get.all.success": "Email templates retrieved successfully",
  "email.template.create.many.success":
    "{{count}} email templates created successfully",
  "email.template.update.many.success":
    "{{count}} email templates updated successfully",
  "email.template.restore.success": "Email template restored successfully",
  "email.template.not.found": "Email template not found",

  // Email send (API keys)
  "email.send.success": "Email sent successfully",
  "email.send.failed": "Failed to send email",
  "email.send.config.not.found": "Email configuration not found",
  "email.send.config.inactive": "Email configuration is inactive",
  "email.send.config.default.not.found":
    "Default email configuration not found",
  "email.send.template.not.found": "Email template not found",
  "email.send.template.inactive": "Email template is inactive",
  "email.send.template.id.or.slug.required": "Template ID or slug is required",

  // email-schema.interface.ts
  "email.template.untitled": "Untitled Template",
  "email.section.header": "Header",
  "email.section.body": "Body",
  "email.section.footer": "Footer",

  // email-container.component.ts
  "email.title": "Email Management",
  "email.subtitle": "Manage email configurations and templates",
  "email.template.title": "Email Templates",
  "email.config.title": "Email Configurations",

  // email-config-form.component.ts
  "email.config.edit.title": "Edit Email Configuration",
  "email.config.new.title": "New Email Configuration",
  "email.config.name": "Configuration Name",
  "email.config.name.example": "e.g., Production SMTP",
  "email.config.provider": "Provider",
  "email.config.select.provider": "Select provider",
  "email.config.from.email": "From Email",
  "email.config.from.email.example": "noreply@example.com",
  "email.config.from.name": "From Name",
  "email.config.from.name.example": "Your App Name",
  "email.config.set.as.default": "Set as Default",
  "email.config.smtp.settings": "SMTP Settings",
  "email.config.smtp.host": "SMTP Host",
  "email.config.smtp.host.example": "smtp.gmail.com",
  "email.config.port": "Port",
  "email.config.smtp.port.example": "587",
  "email.config.username": "Username",
  "email.config.smtp.user.example": "user@gmail.com",
  "email.config.password": "Password",
  "email.config.smtp.password.example": "App password",
  "email.config.use.ssl.tls": "Use SSL/TLS",
  "email.config.sendgrid.settings": "SendGrid Settings",
  "email.config.api.key": "API Key",
  "email.config.api.key.example": "API Key",
  "email.config.mailgun.settings": "Mailgun Settings",
  "email.config.domain": "Domain",
  "email.config.domain.example": "mg.example.com",
  "email.config.region": "Region",
  "email.config.select.region": "Select region",
  "email.provider.smtp": "SMTP",
  "email.provider.sendgrid": "SendGrid",
  "email.provider.mailgun": "Mailgun",
  "email.region.us": "US",
  "email.region.eu": "EU",

  // email-config-list.component.ts
  "email.config.new": "New Configuration",
  "email.config.empty": "No email configurations found",
  "email.config.test.dialog.title": "Test Email Configuration",
  "email.config.configuration": "Configuration",
  "email.config.recipient.email": "Recipient Email",
  "email.recipient.example": "recipient@example.com",
  "email.config.test.dialog.hint":
    "A test email will be sent to verify the configuration",
  "email.config.send.test": "Send Test",
  "email.config.enter.recipient": "Please enter a recipient email address",
  "email.config.delete.title": "Delete Configuration",
  "email.config.test": "Test Configuration",

  // template-form.component.ts
  "email.template.edit.title": "Edit Email Template",
  "email.template.new.title": "New Email Template",
  "email.template.name": "Template Name",
  "email.template.name.example": "e.g., Welcome Email",
  "email.template.slug": "Slug",
  "email.template.slug.example": "e.g., welcome-email",
  "email.template.subject": "Subject",
  "email.template.subject.example": "Enter email subject",
  "email.template.variable.hint": "Use {{variableName}} for dynamic content",
  "email.template.desc": "Description",
  "email.template.desc.placeholder": "Brief description of the template",
  "email.template.content": "Content",
  "email.template.html": "HTML",
  "email.template.plain.text": "Plain Text",
  "email.template.html.placeholder": "Enter HTML content",
  "email.template.text": "Text",
  "email.template.text.placeholder": "Enter plain text content",
  "email.template.plain.text.hint":
    "Plain text is used for email clients that do not support HTML",
  "email.template.preview": "Preview",
  "email.template.live.preview": "Live Preview",
  "email.template.enter.html.preview": "Enter HTML content to see preview",
  "email.template.default.content": "Enter your email content here...",

  // template-list.component.ts
  "email.template.new": "New Template",
  "email.template.test.send": "Send Test Email",
  "email.template.empty": "No email templates found",
  "email.template.test.dialog.title": "Test Email Template",
  "email.template.template": "Template",
  "email.template.email.config": "Email Configuration",
  "email.template.select.config": "Select a configuration",
  "email.template.variables": "Template Variables",
  "email.template.enter.value.for": "Enter value for {{variable}}",
  "email.template.select.config.and.recipient":
    "Please select an email configuration and enter a recipient",
  "email.template.delete.title": "Delete Template",
};

const FORM_BUILDER_MESSAGES: Record<string, string> = {
  // Form CRUD and FORM_MESSAGES (API keys)
  "form.create.success": "Form created successfully",
  "form.create.many.success": "{{count}} forms created successfully",
  "form.get.success": "Form retrieved successfully",
  "form.get.by.ids.success": "Forms retrieved successfully by Ids",
  "form.get.by.filter.success": "Forms retrieved successfully by filter",
  "form.get.all.success": "Forms retrieved successfully",
  "form.update.success": "Form updated successfully",
  "form.update.many.success": "{{count}} forms updated successfully",
  "form.delete.success": "Form deleted successfully",
  "form.restore.success": "Form restored successfully",
  "form.not.found": "Form not found",
  "form.not.public": "This form is not available for public access",
  "form.auth.required": "Authentication required to submit this form",
  "form.access.denied": "You do not have permission to access this form",
  "form.invalid.access.type": "Invalid form access type",
  "form.permission.check.failed":
    "Unable to verify permissions. Please try again.",
  "form.get.access.info.success": "Form access info retrieved successfully",

  // Form result CRUD (API keys)
  "form.result.create.success": "Form result created successfully",
  "form.result.create.many.success":
    "{{count}} form results created successfully",
  "form.result.get.success": "Form result retrieved successfully",
  "form.result.get.by.ids.success":
    "Form results retrieved successfully by Ids",
  "form.result.get.by.filter.success":
    "Form results retrieved successfully by filter",
  "form.result.get.all.success": "Form results retrieved successfully",
  "form.result.update.success": "Form result updated successfully",
  "form.result.update.many.success":
    "{{count}} form results updated successfully",
  "form.result.delete.success": "Form result deleted successfully",
  "form.result.restore.success": "Form result restored successfully",
  "form.result.not.found": "Form result not found",
  "form.result.has.submitted.success": "User has submitted this form",
  "form.result.has.not.submitted.success": "User has not submitted this form",
  "form.result.submit.success": "Form submitted successfully",
  "form.result.draft.get.success": "Draft retrieved successfully",
  "form.result.draft.update.success": "Draft updated successfully",

  // pages/form-list/form-list-page.component.ts
  "form.builder.title": "Forms",
  "form.builder.create.form": "Create Form",
  "form.builder.table.access": "Access",
  "form.builder.table.version": "Version",
  "form.builder.details.no.description": "No description",
  "form.builder.tooltip.view.edit": "View/Edit",
  "form.builder.tooltip.copy.link": "Copy Link",
  "form.builder.tooltip.delete": "Delete",
  "form.builder.toast.copied": "Copied",
  "form.builder.toast.copied.detail": "Form link copied to clipboard",
  "form.builder.access.type.public": "Public",
  "form.builder.access.type.authenticated": "Authenticated",
  "form.builder.access.type.action.group": "Permission-Based",

  // pages/form-details/form-details-page.component.ts
  "form.builder.untitled.form": "Untitled Form",
  "form.builder.action.open.public": "Open Public",
  "form.builder.tooltip.open.public": "Open public form in new tab",
  "form.builder.action.copy.link": "Copy Link",
  "form.builder.tooltip.copy.form.link": "Copy form submission link",
  "form.builder.tab.builder": "Builder",
  "form.builder.tab.settings": "Settings",
  "form.builder.tab.preview": "Preview",
  "form.builder.tab.results": "Results",
  "form.builder.details.form.name": "Form Name",
  "form.builder.details.form.name.placeholder": "Enter form name",
  "form.builder.details.form.description.placeholder": "Enter form description",
  "form.builder.details.form.slug": "Form Slug",
  "form.builder.details.form.slug.placeholder": "e.g., customer-feedback",
  "form.builder.details.used.for.public.urls": "Used for public form URLs",
  "form.builder.details.access.type": "Access Type",
  "form.builder.details.select.actions": "Select Actions",
  "form.builder.details.no.actions.available":
    "No actions available. Configure actions in IAM module first.",
  "form.builder.details.no.actions.empty": "No actions available",
  "form.builder.details.users.with.access":
    "Users with these actions will have access",
  "form.builder.details.selected.permissions": "Selected Permissions",
  "form.builder.details.action.codes.required":
    "These action codes will be required for form access",
  "form.builder.details.required.permissions": "Required Permissions",
  "form.builder.details.permissions.placeholder":
    "Type permission code and press Enter",
  "form.builder.details.users.must.have.permission":
    "Users must have one of these permissions to submit",
  "form.builder.details.response.type": "Response Type",
  "form.builder.details.response.mode.single.hint":
    "Each user can only submit once. For authenticated users, this is enforced by checking existing submissions. For public forms, this uses browser storage.",
  "form.builder.details.response.mode.multiple.hint":
    "Users can submit unlimited responses.",
  "form.builder.details.form.is.active": "Form is Active",
  "form.builder.details.add.fields.to.preview":
    "Add fields in the Builder tab to see preview",
  "form.builder.table.submitted.at": "Submitted At",
  "form.builder.table.schema.version": "Schema Version",
  "form.builder.table.source": "Source",
  "form.builder.table.source.authenticated": "Authenticated",
  "form.builder.table.source.anonymous": "Anonymous",
  "form.builder.tooltip.view.response": "View Response",
  "form.builder.details.no.submissions.yet": "No submissions yet",
  "form.builder.details.access.public": "Public (No Auth Required)",
  "form.builder.details.access.authenticated": "Authenticated (Login Required)",
  "form.builder.details.access.permission": "Permission-Based",
  "form.builder.details.multiple.responses": "Multiple Responses",
  "form.builder.details.single.response": "Single Response",
  "form.builder.toast.validation": "Validation Error",
  "form.builder.toast.form.name.required": "Form name is required",
  "form.builder.toast.created": "Created",
  "form.builder.toast.saved": "Saved",

  // pages/public-form/public-form-page.component.ts
  "form.builder.public.loading": "Loading form...",
  "form.builder.public.something.went.wrong": "Something Went Wrong",
  "form.builder.action.go.back": "Go Back",
  "form.builder.public.access.restricted": "Access Restricted",
  "form.builder.public.access.restricted.description":
    "You don't have the required permissions to view or submit this form. Please contact your administrator if you believe this is an error.",
  "form.builder.public.login.required":
    "This form requires you to be logged in.",
  "form.builder.public.permission.required":
    "This form requires specific permissions. Please log in to continue.",
  "form.builder.action.login.to.continue": "Login to Continue",
  "form.builder.public.continue.your.draft": "Continue Your Draft?",
  "form.builder.public.draft.saved.description":
    "You have a saved draft for this form. Would you like to continue where you left off?",
  "form.builder.public.schema.change.warning":
    "Note: The form has been updated since you saved your draft. Some fields may have changed.",
  "form.builder.action.continue.draft": "Continue Draft",
  "form.builder.action.start.fresh": "Start Fresh",
  "form.builder.public.thank.you": "Thank You!",
  "form.builder.public.response.recorded.success":
    "Your response has been recorded successfully.",
  "form.builder.action.submit.another": "Submit Another Response",
  "form.builder.public.already.submitted": "Already Submitted",
  "form.builder.public.already.submitted.description":
    "You have already submitted a response to this form.",
  "form.builder.public.single.submission.note":
    "This form only allows one submission per user.",
  "form.builder.error.form.id.required": "Form ID is required",
  "form.builder.error.form.not.available":
    "This form does not exist or is not available.",
  "form.builder.error.form.inactive": "This form is currently inactive.",
  "form.builder.error.invalid.configuration": "Invalid form configuration.",
  "form.builder.error.not.public":
    "This form is not available for public access.",
  "form.builder.error.load.failed": "Failed to load form.",
  "form.builder.toast.submitted": "Submitted",
  "form.builder.toast.draft.saved": "Draft Saved",
  "form.builder.toast.draft.saved.detail":
    "Your progress has been saved locally",
  "form.builder.toast.draft.not.saved": "Draft Not Saved",
  "form.builder.toast.draft.not.saved.detail":
    "Unable to save draft. Your browser may be in private mode or storage is full.",
  "form.builder.public.powered.by": "Powered by {{appName}} Form Builder",

  // pages/form-result-viewer/form-result-viewer-page.component.ts
  "form.builder.result.form.submission": "Form Submission",
  "form.builder.action.download.pdf": "Download PDF",
  "form.builder.action.download.json": "Download JSON",
  "form.builder.result.error.loading.submission": "Error Loading Submission",
  "form.builder.error.load.submission.failed": "Failed to load submission",
  "form.builder.error.result.id.required": "Result ID is required",
  "form.builder.toast.downloaded": "Downloaded",
  "form.builder.toast.downloaded.pdf.detail": "PDF has been downloaded",
  "form.builder.toast.downloaded.json.detail": "JSON has been downloaded",
  "form.builder.result.version.notice":
    "This submission was made with form version v{{submissionVersion}}. The current form version is v{{currentVersion}}.",

  // components/builder/builder-toolbar.component.ts
  "form.builder.tooltip.unsaved.changes": "Unsaved changes",
  "form.builder.tooltip.toggle.layout":
    "Toggle between section-based and flat form layout",
  "form.builder.toolbar.flat": "Flat",
  "form.builder.toolbar.sections": "Sections",
  "form.builder.toolbar.section": "Section",
  "form.builder.toolbar.field": "Field",
  "form.builder.toolbar.fields": "Fields",
  "form.builder.action.import": "Import",
  "form.builder.tooltip.import.schema": "Import form schema",
  "form.builder.action.export": "Export",
  "form.builder.tooltip.export.schema": "Export form schema",

  // components/builder/field-palette.component.ts with field-type.enum.ts
  "form.builder.field.types": "Field Types",
  "form.builder.search.fields.placeholder": "Search fields...",
  "form.builder.input.fields": "Input Fields",
  "form.builder.selection.fields": "Selection Fields",
  "form.builder.specialized.fields": "Specialized Fields",
  "form.builder.no.fields.match": 'No fields match "{{query}}"',
  "form.builder.field.text": "Text Field",
  "form.builder.field.textarea": "Text Area",
  "form.builder.field.number": "Number Field",
  "form.builder.field.email": "Email Field",
  "form.builder.field.phone": "Phone",
  "form.builder.field.checkbox": "Checkbox",
  "form.builder.field.radio": "Radio Group",
  "form.builder.field.date": "Date Picker",
  "form.builder.field.time": "Time",
  "form.builder.field.datetime": "Date & Time",
  "form.builder.field.dropdown": "Dropdown",
  "form.builder.field.multi.select": "Multi-Select",
  "form.builder.field.file": "File Upload",
  "form.builder.field.file.upload": "File Upload",
  "form.builder.field.image": "Image Upload",
  "form.builder.field.signature": "Signature",
  "form.builder.field.rating": "Rating",
  "form.builder.field.slider": "Slider",
  "form.builder.field.likert": "Likert Scale",
  "form.builder.field.unknown": "Unknown field type",

  // components/builder/field-editor.component.ts
  "form.builder.section.settings": "Section Settings",
  "form.builder.tab.general": "General",
  "form.builder.tab.validation": "Validation",
  "form.builder.tab.options": "Options",
  "form.builder.tab.logic": "Logic",
  "form.builder.field.label": "Label",
  "form.builder.field.label.placeholder": "Enter field label",
  "form.builder.field.field.name": "Field Name",
  "form.builder.field.name.placeholder": "e.g., first_name",
  "form.builder.field.name.hint":
    "Used as the key in submission data. Must be unique within the form.",
  "form.builder.field.placeholder": "Placeholder",
  "form.builder.placeholder.text": "Enter placeholder text",
  "form.builder.field.help.text": "Help Text",
  "form.builder.help.text.placeholder": "Enter help text",
  "form.builder.label.width": "Width",
  "form.builder.field.required": "Required",
  "form.builder.field.visible": "Visible",
  "form.builder.rating.settings": "Rating Settings",
  "form.builder.rating.number.of.stars": "Number of Stars",
  "form.builder.rating.min.label": "Min Label",
  "form.builder.rating.min.example": "e.g., Not likely",
  "form.builder.rating.max.label": "Max Label",
  "form.builder.rating.max.example": "e.g., Very likely",
  "form.builder.section.name": "Section Name",
  "form.builder.section.name.placeholder": "Enter section name",
  "form.builder.section.description": "Description",
  "form.builder.section.desc.placeholder": "Enter section description",
  "form.builder.section.collapsible": "Collapsible",
  "form.builder.section.initially.collapsed": "Initially Collapsed",
  "form.builder.section.layout": "Layout",
  "form.builder.layout.grid.columns": "Grid Columns",
  "form.builder.layout.grid.columns.hint":
    "Number of columns in the grid layout for this section.",
  "form.builder.layout.field.gap": "Field Gap",
  "form.builder.layout.field.gap.hint": "Spacing between fields in the grid.",
  "form.builder.validation.min.length.label": "Min Length",
  "form.builder.validation.max.length.label": "Max Length",
  "form.builder.email.pattern": "Email Pattern",
  "form.builder.email.pattern.placeholder": "e.g., @gmail\\.com$",
  "form.builder.email.pattern.hint":
    "Regular expression to restrict accepted email domains.",
  "form.builder.email.example.gmail": "Gmail addresses only",
  "form.builder.email.example.domains": "Multiple domains",
  "form.builder.email.pattern.message": "Pattern Error Message",
  "form.builder.email.pattern.message.placeholder":
    "e.g., Only company emails are accepted",
  "form.builder.email.pattern.message.hint":
    "Shown when the email does not match the pattern.",
  "form.builder.validation.min.value": "Min Value",
  "form.builder.validation.max.value": "Max Value",
  "form.builder.validation.step": "Step",
  "form.builder.validation.max.selections": "Max Selections",
  "form.builder.validation.unlimited.hint":
    "Leave empty for unlimited selections.",
  "form.builder.validation.max.files": "Max Files",
  "form.builder.validation.max.file.size": "Max File Size (bytes)",
  "form.builder.validation.no.options":
    "No options added. Add at least one option.",
  "form.builder.likert.scale.labels": "Scale Labels",
  "form.builder.likert.option.number": "Option {{index}}",
  "form.builder.tooltip.remove.column": "Remove column",
  "form.builder.likert.add.column": "Add Column",
  "form.builder.likert.statements": "Statements (Rows)",
  "form.builder.likert.statement.number": "Statement {{index}}",
  "form.builder.likert.add.statement": "Add Statement",
  "form.builder.tooltip.remove.statement": "Remove statement",
  "form.builder.option.label.placeholder": "Enter option label",
  "form.builder.tooltip.remove.option": "Remove option",
  "form.builder.options.add.option": "Add Option",
  "form.builder.section.visibility": "Section Visibility",
  "form.builder.section.visibility.hint":
    "Control when this section is shown based on field values.",
  "form.builder.logic.conditional.rules": "Conditional Rules",
  "form.builder.logic.conditional.rules.hint":
    "Add rules to control visibility or requirements based on other field values.",
  "form.builder.logic.rule.number": "Rule",
  "form.builder.tooltip.remove.rule": "Remove rule",
  "form.builder.logic.no.rules": "No conditional rules defined.",
  "form.builder.logic.add.rule": "Add Rule",
  "form.builder.width.auto": "Auto",
  "form.builder.width.full": "Full Width",
  "form.builder.width.half": "Half Width",
  "form.builder.width.third": "One Third",
  "form.builder.width.quarter": "One Quarter",
  "form.builder.layout.column1": "1 Column",
  "form.builder.layout.column2": "2 Columns",
  "form.builder.layout.column3": "3 Columns",
  "form.builder.layout.column4": "4 Columns",
  "form.builder.layout.gap.small": "Small (0.5rem)",
  "form.builder.layout.gap.medium": "Medium (1rem)",
  "form.builder.layout.gap.large": "Large (1.5rem)",
  "form.builder.layout.gap.x.large": "Extra Large (2rem)",

  // components/builder/logic-builder.component.ts
  "form.builder.logic.add.conditional.logic":
    "Add conditional logic to control when this field is displayed or required.",
  "form.builder.action.add.logic": "Add Logic",
  "form.builder.logic.action.label": "Action",
  "form.builder.logic.select.action.placeholder": "Select action",
  "form.builder.logic.select.target": "Select target",
  "form.builder.logic.when": "When:",
  "form.builder.logic.of.following.conditions":
    "of the following conditions are true",
  "form.builder.logic.select.field": "Select field",
  "form.builder.logic.select.comparison": "Select comparison",
  "form.builder.logic.value.placeholder": "Value",
  "form.builder.logic.select.date": "Select date",
  "form.builder.logic.select.value": "Select value",
  "form.builder.logic.select.values": "Select values",
  "form.builder.logic.remove.condition.tooltip": "Remove condition",
  "form.builder.action.add.condition": "Add Condition",
  "form.builder.action.remove.logic": "Remove Logic",
  "form.builder.logic.any": "Any",
  "form.builder.logic.hide.section": "Hide Section",
  "form.builder.logic.hide.field": "Hide Field",
  "form.builder.logic.make.required": "Make Required",
  "form.builder.logic.jump.to.section": "Jump to Section",
  "form.builder.logic.target": "Target",

  // components/builder/computed-fields-editor.component.ts
  "form.builder.computed.computed.fields": "Computed Fields",
  "form.builder.computed.define.fields":
    "Define fields that are calculated from form responses when submitted",
  "form.builder.action.add.computed.field": "Add Computed Field",
  "form.builder.computed.no.computed.fields": "No computed fields defined",
  "form.builder.computed.click.to.create":
    'Click "Add Computed Field" to create one',
  "form.builder.computed.unnamed.field": "Unnamed Field",
  "form.builder.computed.name": "Name",
  "form.builder.computed.name.placeholder": "e.g., Total Score",
  "form.builder.computed.key": "Key",
  "form.builder.computed.key.placeholder": "e.g., total_score",
  "form.builder.computed.used.in.submission.data": "Used in submission data",
  "form.builder.computed.value.type": "Value Type",
  "form.builder.computed.default.value.label":
    "Default Value (if no rules match)",
  "form.builder.computed.default.number": "Enter default number",
  "form.builder.computed.default.value": "Enter default value",
  "form.builder.computed.computation.rules": "Computation Rules",
  "form.builder.action.add.rule": "Add Rule",
  "form.builder.computed.rules.evaluation.order":
    "Rules are evaluated in order. First matching rule is applied.",
  "form.builder.computed.no.rules.defined":
    "No rules defined. Add a rule to configure computation.",
  "form.builder.computed.rule.number": "Rule {{number}}",
  "form.builder.tooltip.move.up": "Move up",
  "form.builder.tooltip.move.down": "Move down",
  "form.builder.tooltip.delete.rule": "Delete rule",
  "form.builder.computed.condition.optional": "Condition (optional)",
  "form.builder.action.remove.condition": "Remove Condition",
  "form.builder.computed.of.the.following": "of the following:",
  "form.builder.logic.enter.value": "Enter value",
  "form.builder.computed.no.condition.always":
    "No condition = always applies (if reached)",
  "form.builder.computed.then.set.value.to": "Then set value to:",
  "form.builder.logic.select.operation": "Select operation",
  "form.builder.computed.add.operand": "Add Operand",
  "form.builder.computed.delete.computed.field": "Delete Computed Field",
  "form.builder.computed.value.type.number": "Number",
  "form.builder.computed.value.type.text": "Text",
  "form.builder.computed.computation.type.direct": "Direct Value",
  "form.builder.computed.computation.type.field.reference": "Field Reference",
  "form.builder.computed.computation.type.arithmetic": "Arithmetic",
  "form.builder.computed.arithmetic.sum": "Sum",
  "form.builder.computed.arithmetic.subtract": "Subtract",
  "form.builder.computed.arithmetic.multiply": "Multiply",
  "form.builder.computed.arithmetic.divide": "Divide",
  "form.builder.computed.arithmetic.average": "Average",
  "form.builder.computed.arithmetic.min": "Min",
  "form.builder.computed.arithmetic.max": "Max",
  "form.builder.computed.arithmetic.increment": "Increment",
  "form.builder.computed.arithmetic.decrement": "Decrement",
  "form.builder.computed.operand.type.field": "Field",
  "form.builder.computed.operand.type.value": "Value",

  //conditional-logic.interface.ts
  "form.builder.operator.is.empty": "Is empty",
  "form.builder.operator.is.not.empty": "Is not empty",
  "form.builder.operator.is": "Is",
  "form.builder.operator.is.not": "Is not",
  "form.builder.operator.contains": "Contains",
  "form.builder.operator.not.contains": "Does not contain",
  "form.builder.operator.starts.with": "Starts with",
  "form.builder.operator.ends.with": "Ends with",
  "form.builder.operator.equals": "Equals",
  "form.builder.operator.not.equals": "Does not equal",
  "form.builder.operator.greater.than": "Greater than",
  "form.builder.operator.less.than": "Less than",
  "form.builder.operator.greater.or.equal": "Greater than or equal",
  "form.builder.operator.less.or.equal": "Less than or equal",
  "form.builder.operator.is.before": "Is before",
  "form.builder.operator.is.after": "Is after",
  "form.builder.operator.is.checked": "Is checked",
  "form.builder.operator.is.not.checked": "Is not checked",
  "form.builder.operator.is.any.of": "Is any of",
  "form.builder.operator.is.none.of": "Is none of",
  "form.builder.operator.contains.any.of": "Contains any of",
  "form.builder.operator.contains.none.of": "Contains none of",
  "form.builder.operator.row.value.equals": "Row value equals",
  "form.builder.operator.row.value.not.equals": "Row value not equals",
  "form.builder.operator.has.files": "Has files",
  "form.builder.operator.has.no.files": "Has no files",
  "form.builder.logic.action.hide.when": "Hide when...",
  "form.builder.logic.action.require.when": "Require when...",
  "form.builder.logic.action.hide.field.when": "Hide field when...",
  "form.builder.logic.action.make.field.required.when":
    "Make field required when...",
  "form.builder.logic.action.jump.to.section.when": "Jump to section when...",
  "form.builder.logic.action.hide.section.when": "Hide section when...",
  "form.builder.logic.action.hide.this.section.when":
    "Hide this section when...",

  // components/builder/canvas/builder-canvas.component.ts
  "form.builder.section.no.sections": "No sections yet",
  "form.builder.section.start.by.adding": "Start by adding a section",
  "form.builder.section.add": "Add Section",
  "form.builder.new.section": "New Section",

  // components/builder/section-editor.component.ts
  "form.builder.tooltip.conditional.visibility":
    "Conditional visibility rules active",
  "form.builder.tooltip.duplicate.section": "Duplicate section",
  "form.builder.tooltip.delete.section": "Delete section",
  "form.builder.section.drag.fields.here": "Drag fields here",

  // components/builder/responsive-breakpoints-editor.component.ts
  "form.builder.layout.responsive": "Responsive Layout",
  "form.builder.layout.enable.responsive": "Enable responsive layout",
  "form.builder.layout.responsive.hint":
    "Automatically adjust columns based on screen size.",
  "form.builder.layout.mobile": "Mobile",
  "form.builder.layout.tablet": "Tablet",
  "form.builder.layout.desktop": "Desktop",
  "form.builder.layout.large": "Large",
  "form.builder.layout.xl": "Extra Large",

  //components/builder/form-builder.component.ts
  "form.builder.layout.form.layout": "Form Layout",
  "form.builder.layout.click.form.fields":
    'Click "Form Fields" to edit layout settings',
  "form.builder.layout.select.field.to.edit":
    "or select a field to edit its properties",
  "form.builder.layout.select.to.edit":
    "Select a field or section to edit its properties",
  "form.builder.toast.import.failed": "Import Failed",
  "form.builder.toast.import.failed.detail": "Invalid JSON file format",

  // components/viewer/section-viewer.component.ts with services/field-registry.service.ts
  "form.builder.section.default": "Section",
  "form.builder.likert.strongly.disagree": "Strongly Disagree",
  "form.builder.likert.disagree": "Disagree",
  "form.builder.likert.neutral": "Neutral",
  "form.builder.likert.agree": "Agree",
  "form.builder.likert.strongly.agree": "Strongly Agree",
  "form.builder.defaults.option1": "Option 1",
  "form.builder.defaults.option2": "Option 2",
  "form.builder.defaults.statement1": "Statement 1",
  "form.builder.defaults.statement2": "Statement 2",

  // components/result/form-result-viewer.component.ts
  "form.builder.result.submitted": "Submitted",
  "form.builder.result.version": "Version",
  "form.builder.result.fields.answered":
    "{{answered}} / {{total}} fields answered",
  "form.builder.result.computed.title": "Computed Results",
  "form.builder.result.computed.subtitle":
    "Auto-calculated based on your responses",
  "form.builder.status.draft": "Draft",
  "form.builder.status.completed": "Completed",

  // components/result/field-result.component.ts
  "form.builder.result.no.selection": "No selection",
  "form.builder.result.no.responses": "No responses",
  "form.builder.result.no.rating": "No rating",
  "form.builder.result.no.file.uploaded": "No file uploaded",
  "form.builder.result.no.answer": "No answer",

  // services/validation.service.ts
  "form.builder.validation.required": "{{label}} is required",
  "form.builder.validation.email": "Please enter a valid email address",
  "form.builder.validation.must.match.format":
    "{{label}} must match the required format",
  "form.builder.validation.min.length":
    "{{label}} must be at least {{value}} characters",
  "form.builder.validation.max.length":
    "{{label}} must be at most {{value}} characters",
  "form.builder.validation.min": "{{label}} must be at least {{value}}",
  "form.builder.validation.max": "{{label}} must be at most {{value}}",
  "form.builder.validation.pattern": "{{label}} format is invalid",
  "form.builder.validation.invalid": "{{label}} is invalid",

  //services/schema-export.service.ts
  "form.builder.schema.invalid": "Invalid schema",
  "form.builder.schema.invalid.json": "Invalid JSON format",
  "form.builder.schema.browser.only":
    "This feature is only available in browser",
  "form.builder.schema.read.failed": "Failed to read file",
  "form.builder.validation.schema.must.be.object": "Schema must be an object",
  "form.builder.validation.schema.id.required": "Schema must have a string id",
  "form.builder.validation.schema.name.required":
    "Schema must have a string name",
  "form.builder.validation.schema.sections.required":
    "Schema must have a sections array",
  "form.builder.validation.section.must.be.object": "Section must be an object",
  "form.builder.validation.section.id.required":
    "Section must have a string id",
  "form.builder.validation.section.name.required":
    "Section must have a string name",
  "form.builder.validation.section.fields.required":
    "Section must have a fields array",
  "form.builder.validation.section.invalid.layout": "Invalid layout type",
  "form.builder.validation.field.must.be.object": "Field must be an object",
  "form.builder.validation.field.id.required": "Field must have a string id",
  "form.builder.validation.field.invalid.type": "Invalid field type",
  "form.builder.validation.field.label.required":
    "Field must have a string label",
  "form.builder.validation.field.options.required":
    "Selection field must have an options array",

  // services/pdf-export.service.ts
  "form.builder.pdf.browser.only": "PDF export is only available in browser",
  "form.builder.pdf.stats.sections": "Sections",
  "form.builder.pdf.stats.total.fields": "Total Fields",
  "form.builder.pdf.stats.answered": "Answered",
  "form.builder.pdf.stats.complete": "Complete",
  "form.builder.pdf.footer": "Generated by Form Builder",
  "form.builder.pdf.table.question": "Question",
  "form.builder.pdf.table.response": "Response",
  "form.builder.pdf.no.fields.in.section": "No fields in this section",
  "form.builder.pdf.table.computed.field": "Computed Field",
  "form.builder.pdf.table.result": "Result",

  //form-viwer.component.ts
  "form.builder.action.submit": "Submit",
  "form.builder.action.save.draft": "Save Draft",
  "form.builder.action.next": "Next",

  //canvas/flat-canvas.component.ts
  "form.builder.field.form.fields": "Form Fields",
  "form.builder.field.drag.from.palette": "Drag fields from the palette",
  "form.builder.field.no.fields": "No fields",
  "form.builder.field.drag.from.left.panel": "Drag fields from the left panel",

  // canvas/field-preview.component.ts
  "form.builder.tooltip.duplicate": "Duplicate",
};

const EVENT_MANAGER_MESSAGES: Record<string, string> = {
  // Event CRUD and EVENT_MESSAGES (API keys)
  "event.create.success": "Event created successfully",
  "event.create.many.success": "{{count}} events created successfully",
  "event.get.success": "Event retrieved successfully",
  "event.get.by.ids.success": "Events retrieved successfully by Ids",
  "event.get.by.filter.success": "Events retrieved successfully by filter",
  "event.get.all.success": "Events retrieved successfully",
  "event.update.success": "Event updated successfully",
  "event.update.many.success": "{{count}} events updated successfully",
  "event.delete.success": "Event deleted successfully",
  "event.restore.success": "Event restored successfully",
  "event.not.found": "Event not found",

  // EVENT_PARTICIPANT_MESSAGES (API keys)
  "event.participant.not.found": "Participant not found",
  "event.participant.status.update.success":
    "Participant status updated successfully",

  // ─── Shared Keys (used across multiple files) ────────────────────────────────
  "event.manager.my.events": "My Events",
  "event.manager.all.events": "All Events",
  "event.manager.recurrence.none": "None",
  "event.manager.recurrence.daily": "Daily",
  "event.manager.recurrence.weekly": "Weekly",
  "event.manager.recurrence.biweekly": "Bi-weekly",
  "event.manager.recurrence.monthly": "Monthly",

  // ─── pages/event-manager-container ──────────────────────────────────────────

  "event.manager.title": "Event Manager",
  "event.manager.subtitle": "Manage events, meetings, and schedules",
  "event.manager.tabs.calendar": "Calendar",
  "event.manager.tabs.event.list": "Event List",

  // ─── pages/calendar-page ────────────────────────────────────────────────────

  "event.manager.calendar.title": "Calendar",
  "event.manager.event.saved.success": 'Event "{{title}}" saved successfully.',

  // ─── pages/event-list-page
  "event.manager.event.list.title": "Event List",
  "event.manager.new.event": "New Event",
  "event.manager.table.title": "Title",
  "event.manager.table.start": "Start",
  "event.manager.table.end": "End",
  "event.manager.recurrence": "Recurrence",
  "event.manager.table.participants": "Participants",
  "event.manager.participants": "participant(s)",
  "event.manager.no.events.in.company": "No events found in current company",
  "event.manager.no.events": "No events found",

  // ─── components/event-form-dialog
  "event.manager.form.title.required": "Title *",
  "event.manager.placeholder.title": "Enter event title",
  "event.manager.form.description": "Description",
  "event.manager.placeholder.description": "Enter description (optional)",
  "event.manager.form.date.required": "Date is required",
  "event.manager.placeholder.event.date": "Select event date",
  "event.manager.form.all.day.event": "All Day Event",
  "event.manager.form.start.time.required": "Start time is required",
  "event.manager.form.end.time.required": "End time is required",
  "event.manager.placeholder.recurrence": "Select recurrence",
  "event.manager.form.repeat.on": "Repeat On",
  "event.manager.form.recurrence.end": "Recurrence End (Optional)",
  "event.manager.placeholder.recurrence.end": "Leave empty for no end date",
  "event.manager.form.recurrence.end.hint": "Leave empty to repeat forever",
  "event.manager.form.meeting.link": "Meeting Link",
  "event.manager.placeholder.meeting.link":
    "https://meet.google.com/... (optional)",
  "event.manager.form.color": "Color",
  "event.manager.form.participants": "Participants",
  "event.manager.placeholder.participants": "Select participants...",
  "event.manager.weekday.su": "Su",
  "event.manager.weekday.mo": "Mo",
  "event.manager.weekday.tu": "Tu",
  "event.manager.weekday.we": "We",
  "event.manager.weekday.th": "Th",
  "event.manager.weekday.fr": "Fr",
  "event.manager.weekday.sa": "Sa",
  "event.manager.dialog.edit.event": "Edit Event",
  "event.manager.dialog.new.event": "New Event",

  // ─── components/calendar-view
  "event.manager.today": "Today",
  "event.manager.view.month": "Month",
  "event.manager.view.week": "Week",
  "event.manager.view.day": "Day",

  // ─── components/event-detail-panel
  "event.manager.all.day": "All Day",
  "event.manager.join": "Join",

  // ─── components/calendar-month
  "event.manager.more.events": "+{{count}} more",
  "event.manager.weekday.sun": "Sun",
  "event.manager.weekday.mon": "Mon",
  "event.manager.weekday.tue": "Tue",
  "event.manager.weekday.wed": "Wed",
  "event.manager.weekday.thu": "Thu",
  "event.manager.weekday.fri": "Fri",
  "event.manager.weekday.sat": "Sat",

  // ─── components/calendar-event-item
  "event.manager.all.day.parens": "(All Day)",
  "event.manager.time.to": "to",

  // ─── utils/base-event-page
  "event.manager.delete.this.item": "this item",
};

const NOTIFICATION_MESSAGES = {
  // Notification CRUD (API keys)
  "notification.create.success": "Notification created successfully",
  "notification.create.many.success":
    "{{count}} notifications created successfully",
  "notification.get.success": "Notification retrieved successfully",
  "notification.get.by.ids.success":
    "Notifications retrieved successfully by Ids",
  "notification.get.by.filter.success":
    "Notifications retrieved successfully by filter",
  "notification.get.all.success": "Notifications retrieved successfully",
  "notification.update.success": "Notification updated successfully",
  "notification.update.many.success":
    "{{count}} notifications updated successfully",
  "notification.delete.success": "Notification deleted successfully",
  "notification.restore.success": "Notification restored successfully",
  "notification.not.found": "Notification not found",
  "notification.mark.read.success": "Notification marked as read",
  "notification.mark.all.read.success":
    "{{count}} notifications marked as read",
  "notification.unread.count.success": "Unread count retrieved",
  "notification.send.success": "Notification sent successfully",
  "notification.broadcast.success": "{{count}} notifications sent successfully",

  // pages/notification-list-page/notification-list-page.component.ts
  "notification.empty.title": "No notifications yet",
  "notification.empty.subtitle": "You're all caught up!",
};

const LOCALIZATION_MESSAGES: Record<string, string> = {
  // Language CRUD (API keys)
  "language.create.success": "Language created successfully",
  "language.create.many.success": "{{count}} languages created successfully",
  "language.get.success": "Language retrieved successfully",
  "language.get.by.ids.success": "Languages retrieved successfully by Ids",
  "language.get.by.filter.success":
    "Languages retrieved successfully by filter",
  "language.get.all.success": "Languages retrieved successfully",
  "language.update.success": "Language updated successfully",
  "language.update.many.success": "{{count}} languages updated successfully",
  "language.delete.success": "Language deleted successfully",
  "language.restore.success": "Language restored successfully",
  "language.active.success": "Active languages retrieved successfully",
  "language.set.default.success": "Default language updated successfully",
  "language.get.default.success": "Default language retrieved successfully",

  // Translation key CRUD (API keys)
  "translation.key.create.success": "Translation key created successfully",
  "translation.key.create.many.success":
    "{{count}} translation keys created successfully",
  "translation.key.get.success": "Translation key retrieved successfully",
  "translation.key.get.by.ids.success":
    "Translation keys retrieved successfully by Ids",
  "translation.key.get.by.filter.success":
    "Translation keys retrieved successfully by filter",
  "translation.key.get.all.success": "Translation keys retrieved successfully",
  "translation.key.update.success": "Translation key updated successfully",
  "translation.key.update.many.success":
    "{{count}} translation keys updated successfully",
  "translation.key.delete.success": "Translation key deleted successfully",
  "translation.key.restore.success": "Translation key restored successfully",
  "translation.key.modules.success": "Modules retrieved successfully",
  "translation.key.readonly.delete.forbidden":
    "Cannot delete readonly translation keys: {{keys}}",
  "translation.key.readonly.update.forbidden":
    "Cannot modify key or module of system translation keys",
  "translation.key.duplicate.key.in.module":
    'Translation key "{{key}}" already exists in module "{{module}}"',

  // Translation CRUD (API keys)
  "translation.create.success": "Translation created successfully",
  "translation.create.many.success":
    "{{count}} translations created successfully",
  "translation.get.success": "Translation retrieved successfully",
  "translation.get.by.ids.success":
    "Translations retrieved successfully by Ids",
  "translation.get.by.filter.success":
    "Translations retrieved successfully by filter",
  "translation.get.all.success": "Translations retrieved successfully",
  "translation.update.success": "Translation updated successfully",
  "translation.update.many.success":
    "{{count}} translations updated successfully",
  "translation.delete.success": "Translation deleted successfully",
  "translation.restore.success": "Translation restored successfully",
  "translation.by.language.success": "Translations retrieved successfully",

  // pages/localization-container/localization-container.page.ts
  "localization.title": "Localization",
  "localization.subtitle": "Manage languages and translations",
  "localization.tabs.languages": "Languages",
  "localization.tabs.keys": "Keys",

  // pages/language-list/language-list.page.ts
  "localization.language.title": "Languages",
  "localization.language.subtitle":
    "Manage available languages for your application",
  "localization.language.new": "Add Language",
  "localization.language.code": "Language Code",
  "localization.language.name": "Language Name",
  "localization.language.native.name": "Native Name",
  "localization.language.direction": "Text Direction",
  "localization.language.rtl": "RTL",
  "localization.language.ltr": "LTR",
  "localization.language.default": "Default",
  "localization.language.set.default": "Set as Default",
  "localization.language.empty":
    "No languages configured. Add a language to get started.",
  "localization.language.confirm.set.default":
    'Set "{{name}}" as the default language?',
  "localization.language.delete.title": "Delete Language",

  // pages/language-form/language-form.page.ts
  "localization.language.edit": "Edit Language",
  "localization.placeholder.code": "en",
  "localization.language.iso.code.hint":
    "ISO 639-1 language code (e.g., en, ar, fr)",
  "localization.placeholder.name": "English",
  "localization.placeholder.native.name": "English",
  "localization.language.native.name.hint":
    "Name in the native language (e.g., العربية for Arabic)",
  "localization.language.display.order": "Display Order",
  "localization.language.direction.ltr": "Left to Right (LTR)",
  "localization.language.direction.rtl": "Right to Left (RTL)",
  "localization.validation.code.required": "Language code is required",
  "localization.validation.code.max.length":
    "Language code must be at most 10 characters",
  "localization.validation.name.required": "Language name is required",
  "localization.validation.name.max.length":
    "Language name must be at most 100 characters",

  // pages/translation-key-list/translation-key-list.page.ts
  "localization.key.title": "Translation Keys",
  "localization.key.subtitle": "Manage translation keys for your application",
  "localization.key.new": "Add Key",
  "localization.key.filter.module": "Filter by module",
  "localization.key.module": "Module",
  "localization.key.name": "Key Name",
  "localization.key.default.message": "Default Message",
  "localization.key.translations": "Translations",
  "localization.key.empty": "No translation keys found",
  "localization.key.delete.title": "Delete Translation Key",

  // pages/translation-key-form/translation-key-form.page.ts
  "localization.key.edit": "Edit Key",
  "localization.key.about": "Key Information",
  "localization.placeholder.key.name": "button.submit",
  "localization.key.select.module": "Select or enter module",
  "localization.placeholder.default.message": "Enter default value (English)",
  "localization.key.description": "Description",
  "localization.placeholder.key.description":
    "Optional description for translators",
  "localization.key.variables": "Variables",
  "localization.key.variables.placeholder": "e.g., name, count, date",
  "localization.key.variables.hint":
    "Enter variable names used in this translation",
  "localization.key.translations.section": "Translations",
  "localization.key.no.languages": "No active languages configured",
  "localization.key.enter.translation": "Enter translation",
  "localization.validation.key.required": "Translation key is required",
  "localization.validation.default.message.required":
    "Default message is required",
};

interface ModuleConfig {
  name: string;
  messages: Record<string, string>;
  readOnly: boolean;
  enabled: boolean;
}

const MODULE_CONFIGS: ModuleConfig[] = [
  { name: "shared", messages: SHARED_MESSAGES, readOnly: true, enabled: true },
  { name: "auth", messages: AUTH_MESSAGES, readOnly: true, enabled: true },
  {
    name: "administrative",
    messages: ADMINISTRATIVE_MESSAGES,
    readOnly: true,
    enabled: true,
  },
  {
    name: "profile",
    messages: PROFILE_MESSAGES,
    readOnly: true,
    enabled: true,
  },
  { name: "iam", messages: IAM_MESSAGES, readOnly: true, enabled: true },
  { name: "layout", messages: LAYOUT_MESSAGES, readOnly: true, enabled: true },
  {
    name: "storage",
    messages: STORAGE_MESSAGES,
    readOnly: true,
    enabled: ENABLE_STORAGE,
  },
  {
    name: "email",
    messages: EMAIL_MESSAGES,
    readOnly: true,
    enabled: ENABLE_EMAIL,
  },
  {
    name: "formBuilder",
    messages: FORM_BUILDER_MESSAGES,
    readOnly: true,
    enabled: ENABLE_FORM_BUILDER,
  },
  {
    name: "eventManager",
    messages: EVENT_MANAGER_MESSAGES,
    readOnly: true,
    enabled: ENABLE_EVENT_MANAGER,
  },
  {
    name: "notification",
    messages: NOTIFICATION_MESSAGES,
    readOnly: true,
    enabled: ENABLE_NOTIFICATION,
  },
  {
    name: "localization",
    messages: LOCALIZATION_MESSAGES,
    readOnly: true,
    enabled: ENABLE_LOCALIZATION,
  },
];

export const BENGALI_TRANSLATIONS = {
  "auth.token.required": "রিফ্রেশ টোকেন প্রয়োজন",
  "auth.token.invalid": "অবৈধ টোকেন",
  "entity.belongs.another.company": "{{entity}} অন্য একটি কোম্পানির অন্তর্গত",
  "auth.company.no.access": "এই কোম্পানিতে কোনো অ্যাক্সেস নেই",

  "error.not.found": "রিসোর্স পাওয়া যায়নি",
  "error.validation": "যাচাইকরণ ব্যর্থ হয়েছে",
  "error.unauthorized": "অননুমোদিত অ্যাক্সেস",
  "error.forbidden": "অ্যাক্সেস নিষিদ্ধ",
  "error.conflict": "রিসোর্স দ্বন্দ্ব",
  "error.internal": "অভ্যন্তরীণ সার্ভার ত্রুটি",
  "error.service.unavailable": "সেবা সাময়িকভাবে অনুপলব্ধ",
  "error.unknown": "অজানা ত্রুটি ঘটেছে",
  "error.http": "HTTP ত্রুটি",
  "error.generic": "একটি ত্রুটি ঘটেছে",
  "error.permission.system.unavailable":
    "অনুমতি সিস্টেম সাময়িকভাবে অনুপলব্ধ। অনুগ্রহ করে পরে আবার চেষ্টা করুন।",
  "error.insufficient.permissions":
    "প্রয়োজনীয় অনুমতি অনুপস্থিত: {{permissions}}",
  "error.insufficient.permissions.or": "কমপক্ষে একটি প্রয়োজন: {{permissions}}",
  "error.no.permissions.found":
    "কোনো অনুমতি পাওয়া যায়নি। অনুগ্রহ করে প্রশাসকের সাথে যোগাযোগ করুন।",
  "error.endpoint.disabled": "এন্ডপয়েন্ট {{endpoint}} নিষ্ক্রিয় করা আছে",

  "system.repository.not.available": "{{entity}} রিপোজিটরি উপলব্ধ নয়",
  "system.datasource.not.available": "ডেটা উৎস উপলব্ধ নয়",
  "system.database.config.not.available": "ডেটাবেস কনফিগারেশন উপলব্ধ নয়",
  "system.service.not.available":
    'সেবা "{{provider}}" উপলব্ধ নয়। উপলব্ধ: {{available}}',
  "system.config.required": "কনফিগারেশন প্রয়োজন",
  "system.internal.error": '"{{provider}}" আরম্ভ করতে ব্যর্থ: {{error}}',
  "system.duplicate.request": "ডুপ্লিকেট অনুরোধ সনাক্ত করা হয়েছে",
  "system.invalid.tenant.id": "অবৈধ টেনান্ট আইডি",
  "system.tenant.not.found": 'টেনান্ট "{{tenantId}}" পাওয়া যায়নি',
  "system.tenant.header.required":
    'টেনান্ট পাওয়া যায়নি। নিশ্চিত করুন "{{header}}" হেডার সেট করা আছে।',
  "system.missing.parameter": "প্রয়োজনীয় প্যারামিটার অনুপস্থিত: {{key}}",
  "system.sdk.not.installed":
    'প্রয়োজনীয় SDK "{{sdk}}" ইনস্টল করা নেই। চালান: npm install {{sdk}}',
  "system.path.traversal.detected": "পাথ ট্রাভার্সাল সনাক্ত করা হয়েছে",
  "system.invalid.file.key": "অবৈধ ফাইল কী",

  "shared.success": "সফল",
  "shared.error": "ত্রুটি",
  "shared.info": "তথ্য",
  "shared.warning": "সতর্কতা",
  "shared.confirm.delete.header": "মুছে ফেলা নিশ্চিত করুন",

  "shared.validation.error": "যাচাইকরণ ত্রুটি",
  "shared.fill.required.fields":
    "অনুগ্রহ করে সমস্ত প্রয়োজনীয় ফিল্ড পূরণ করুন",

  "shared.file.selector.provider.not.configured":
    "ফাইল নির্বাচন কনফিগার করা নেই।",
  "shared.file.selector.add.provider": "যোগ করুন",
  "shared.close": "বন্ধ করুন",
  "shared.file.selector.search.placeholder": "ফাইল অনুসন্ধান করুন...",
  "shared.file.selector.all.folders": "সমস্ত ফোল্ডার",
  "shared.file.selector.all.storage": "সমস্ত স্টোরেজ",
  "shared.default": "ডিফল্ট",
  "shared.file.selector.selected": "{{count}} নির্বাচিত",
  "shared.file.selector.no.files": "কোনো ফাইল পাওয়া যায়নি",
  "shared.cancel": "বাতিল",
  "shared.file.selector.select.multiple": "নির্বাচন ({{count}})",
  "shared.file.selector.select": "নির্বাচন",
  "shared.file.selector.select.files": "ফাইল নির্বাচন করুন",
  "shared.file.selector.select.file": "ফাইল নির্বাচন করুন",

  "shared.upload.provider.not.configured":
    "ফাইল আপলোড কনফিগার করা নেই। আপনার অ্যাপ কনফিগে {{provider}} যোগ করুন।",
  "shared.upload.uploading": "{{fileName}} আপলোড হচ্ছে...",
  "shared.upload.drop.multiple":
    "ফাইলগুলো এখানে ড্রপ করুন অথবা আপলোড করতে ক্লিক করুন",
  "shared.upload.drop.single":
    "ফাইলটি এখানে ড্রপ করুন অথবা আপলোড করতে ক্লিক করুন",
  "shared.upload.allowed.types": "অনুমোদিত:",
  "shared.upload.all.types.allowed": "সমস্ত ফাইল টাইপ অনুমোদিত",
  "shared.upload.max.size": "(সর্বোচ্চ {{size}}MB)",
  "shared.file.uploader.no.upload.function":
    "কোনো আপলোড ফাংশন উপলব্ধ নেই। FILE_PROVIDER কনফিগার করুন বা uploadFile ইনপুট প্রদান করুন।",
  "shared.file.type.images": "ছবি",
  "shared.file.type.documents": "ডকুমেন্ট",
  "shared.file.type.videos": "ভিডিও",
  "shared.file.type.audio": "অডিও",
  "shared.upload.invalid.type": "অবৈধ ফাইল টাইপ",
  "shared.upload.file.too.large": "ফাইল অত্যন্ত বড়",
  "shared.size.mb": "MB",
  "shared.upload.files": "ফাইল",
  "shared.upload.complete": "আপলোড সম্পন্ন",
  "shared.upload.failed": "আপলোড ব্যর্থ",
  "shared.upload.files.uploaded": "{{count}}টি ফাইল সফলভাবে আপলোড হয়েছে",
  "shared.size.kb": "KB",

  "shared.select.placeholder": "বিকল্প নির্বাচন করুন",

  "shared.multi.select.placeholder": "বিকল্পসমূহ নির্বাচন করুন",
  "shared.multi.select.items.selected": "{{count}}টি আইটেম নির্বাচিত",

  "shared.user.select.placeholder": "ব্যবহারকারী নির্বাচন করুন",

  "shared.actions": "অ্যাকশন",
  "shared.active": "সক্রিয়",
  "shared.add": "যোগ করুন",
  "shared.created": "তৈরি হয়েছে",
  "shared.all": "সকল",
  "shared.assigned": "অর্পিত",
  "shared.back": "পিছনে",
  "shared.code": "কোড",
  "shared.company": "কোম্পানি",
  "shared.confirm": "নিশ্চিত করুন",
  "shared.confirm.delete": "আপনি কি নিশ্চিত এই আইটেমটি মুছে ফেলতে চান?",
  "shared.confirm.delete.item": 'আপনি কি নিশ্চিত "{{name}}" মুছে ফেলতে চান?',
  "shared.continue": "চালিয়ে যান",
  "shared.create": "তৈরি করুন",
  "shared.delete": "মুছুন",
  "shared.description": "বিবরণ",
  "shared.description.placeholder": "বিবরণ লিখুন",
  "shared.deselect.all": "সব অনির্বাচন করুন",
  "shared.display.order": "প্রদর্শন ক্রম",
  "shared.display.order.placeholder": "প্রদর্শন ক্রম লিখুন",
  "shared.edit": "সম্পাদনা",
  "shared.error.bad.request": "ভুল অনুরোধ",
  "shared.error.conflict": "দ্বন্দ্ব",
  "shared.error.not.found": "পাওয়া যায়নি",
  "shared.error.server.error": "সার্ভার ত্রুটি",
  "shared.error.service.unavailable": "সেবা অনুপলব্ধ",
  "shared.error.validation.error": "যাচাইকরণ ত্রুটি",
  "shared.inactive": "নিষ্ক্রিয়",
  "shared.invalid.email": "অনুগ্রহ করে একটি বৈধ ইমেইল ঠিকানা লিখুন",
  "shared.loading.actions": "অ্যাকশন লোড হচ্ছে...",
  "shared.loading.roles": "ভূমিকা লোড হচ্ছে...",
  "shared.min.characters": "সর্বনিম্ন {{count}} অক্ষর",
  "shared.na": "প্রযোজ্য নয়",
  "shared.name": "নাম",
  "shared.name.required": "নাম প্রয়োজন",
  "shared.no": "না",
  "shared.no.results": "কোনো ফলাফল পাওয়া যায়নি",
  "shared.not.assigned": "অর্পিত নয়",
  "shared.pending.changes": "অপেক্ষমাণ পরিবর্তন",
  "shared.read.only": "শুধু পাঠযোগ্য",
  "shared.remove": "সরান",
  "shared.save": "সংরক্ষণ করুন",
  "shared.save.changes": "পরিবর্তন সংরক্ষণ করুন",
  "shared.search": "অনুসন্ধান",
  "shared.select": "নির্বাচন করুন...",
  "shared.select.all": "সব নির্বাচন করুন",
  "shared.select.deselect.all": "সব নির্বাচন/অনির্বাচন",
  "shared.status": "স্থিতি",
  "shared.to.add": "যোগ করার জন্য",
  "shared.to.assign": "অর্পণের জন্য",
  "shared.to.remove": "অপসারণের জন্য",
  "shared.to.whitelist": "হোয়াইটলিস্টের জন্য",
  "shared.type": "ধরন",
  "shared.unexpected.error": "একটি অপ্রত্যাশিত ত্রুটি ঘটেছে",
  "shared.unknown": "অজানা",
  "shared.update": "হালনাগাদ",
  "shared.upload": "আপলোড",
  "shared.validation.required": "{{field}} প্রয়োজন",
  "shared.verified": "যাচাইকৃত",
  "shared.view": "দেখুন",
  "shared.view.details": "বিস্তারিত দেখুন",
  "shared.yes": "হ্যাঁ",
  "shared.validation": "যাচাইকরণ",

  "primeng.accept": "হ্যাঁ",
  "primeng.add.rule": "নিয়ম যোগ করুন",
  "primeng.apply": "প্রয়োগ করুন",
  "primeng.aria.cancel.edit": "সম্পাদনা বাতিল",
  "primeng.aria.close": "বন্ধ করুন",
  "primeng.aria.collapse.row": "সারি সঙ্কুচিত",
  "primeng.aria.edit.row": "সারি সম্পাদনা",
  "primeng.aria.expand.row": "সারি প্রসারিত",
  "primeng.aria.false.label": "মিথ্যা",
  "primeng.aria.filter.constraint": "ফিল্টার শর্ত",
  "primeng.aria.filter.operator": "ফিল্টার অপারেটর",
  "primeng.aria.first.page.label": "প্রথম পৃষ্ঠা",
  "primeng.aria.grid.view": "গ্রিড ভিউ",
  "primeng.aria.hide.filter.menu": "ফিল্টার মেনু লুকান",
  "primeng.aria.jump.to.page.dropdown.label": "পৃষ্ঠায় যান ড্রপডাউন",
  "primeng.aria.jump.to.page.input.label": "পৃষ্ঠায় যান ইনপুট",
  "primeng.aria.last.page.label": "শেষ পৃষ্ঠা",
  "primeng.aria.list.view": "তালিকা ভিউ",
  "primeng.aria.move.all.to.source": "সব উৎসে সরান",
  "primeng.aria.move.all.to.target": "সব লক্ষ্যে সরান",
  "primeng.aria.move.bottom": "নিচে সরান",
  "primeng.aria.move.down": "নিচে",
  "primeng.aria.move.to.source": "উৎসে সরান",
  "primeng.aria.move.to.target": "লক্ষ্যে সরান",
  "primeng.aria.move.top": "উপরে সরান",
  "primeng.aria.move.up": "উপরে",
  "primeng.aria.navigation": "নেভিগেশন",
  "primeng.aria.next": "পরবর্তী",
  "primeng.aria.next.page.label": "পরবর্তী পৃষ্ঠা",
  "primeng.aria.null.label": "নির্বাচিত নয়",
  "primeng.aria.page.label": "পৃষ্ঠা {page}",
  "primeng.aria.prev.page.label": "পূর্ববর্তী পৃষ্ঠা",
  "primeng.aria.previous": "পূর্ববর্তী",
  "primeng.aria.rotate.left": "বামে ঘুরান",
  "primeng.aria.rotate.right": "ডানে ঘুরান",
  "primeng.aria.rows.per.page.label": "প্রতি পৃষ্ঠায় সারি",
  "primeng.aria.save.edit": "সম্পাদনা সংরক্ষণ",
  "primeng.aria.scroll.top": "উপরে স্ক্রল",
  "primeng.aria.select.all": "সমস্ত আইটেম নির্বাচিত",
  "primeng.aria.select.row": "সারি নির্বাচিত",
  "primeng.aria.show.filter.menu": "ফিল্টার মেনু দেখান",
  "primeng.aria.slide": "স্লাইড",
  "primeng.aria.slide.number": "{slideNumber}",
  "primeng.aria.star": "১ তারকা",
  "primeng.aria.stars": "{star} তারকা",
  "primeng.aria.true.label": "সত্য",
  "primeng.aria.unselect.all": "সমস্ত আইটেম অনির্বাচিত",
  "primeng.aria.unselect.row": "সারি অনির্বাচিত",
  "primeng.aria.zoom.image": "ছবি জুম",
  "primeng.aria.zoom.in": "জুম ইন",
  "primeng.aria.zoom.out": "জুম আউট",
  "primeng.cancel": "বাতিল",
  "primeng.choose": "বেছে নিন",
  "primeng.choose.date": "তারিখ বেছে নিন",
  "primeng.clear": "পরিষ্কার করুন",
  "primeng.contains": "ধারণ করে",
  "primeng.date.after": "তারিখ পরে",
  "primeng.date.before": "তারিখ আগে",
  "primeng.date.is": "তারিখ হলো",
  "primeng.date.is.not": "তারিখ নয়",
  "primeng.empty.filter.message": "কোনো ফলাফল পাওয়া যায়নি",
  "primeng.empty.message": "কোনো ফলাফল পাওয়া যায়নি",
  "primeng.empty.search.message": "কোনো ফলাফল পাওয়া যায়নি",
  "primeng.empty.selection.message": "কোনো নির্বাচিত আইটেম নেই",
  "primeng.ends.with": "দিয়ে শেষ হয়",
  "primeng.equals": "সমান",
  "primeng.first.day.of.week": "0",
  "primeng.gt": "বড়",
  "primeng.gte": "বড় বা সমান",
  "primeng.lt": "ছোট",
  "primeng.lte": "ছোট বা সমান",
  "primeng.match.all": "সব মিল",
  "primeng.match.any": "যেকোনো মিল",
  "primeng.no.filter": "কোনো ফিল্টার নেই",
  "primeng.not.contains": "ধারণ করে না",
  "primeng.not.equals": "সমান নয়",
  "primeng.pending": "অপেক্ষমাণ",
  "primeng.reject": "না",
  "primeng.remove.rule": "নিয়ম সরান",
  "primeng.selection.message": "{0}টি আইটেম নির্বাচিত",
  "primeng.starts.with": "দিয়ে শুরু হয়",
  "primeng.today": "আজ",
  "primeng.upload": "আপলোড",
  "primeng.week.header": "সপ্তাহ",
  "primeng.choose.year": "বছর বেছে নিন",
  "primeng.choose.month": "মাস বেছে নিন",
  "primeng.date.format": "mm/dd/yy",
  "primeng.weak": "দুর্বল",
  "primeng.medium": "মাঝারি",
  "primeng.strong": "শক্তিশালী",
  "primeng.password.prompt": "একটি পাসওয়ার্ড লিখুন",
  "primeng.country.placeholder": "একটি দেশ বেছে নিন",

  "layout.profile.title": "প্রোফাইল",
  "layout.profile.profile.picture.alt": "প্রোফাইল ছবি",
  "layout.profile.copy.sign.up.link": "সাইনআপ লিঙ্ক কপি করুন",
  "layout.profile.logout": "লগআউট",
  "layout.profile.guest": "অতিথি",
  "layout.profile.link.copied": "লিঙ্ক কপি হয়েছে",
  "layout.profile.sign.up.link.copied": "সাইন আপ লিঙ্ক কপি করা হয়েছে।",
  "layout.profile.failed.copy.sign.up.link": "সাইনআপ লিঙ্ক কপি করতে ব্যর্থ।",

  "layout.launcher.apps": "অ্যাপস",
  "layout.launcher.applications": "অ্যাপ্লিকেশনস",

  "layout.company.branch.selector.title": "কোম্পানি ও শাখা পরিবর্তন",
  "layout.company.branch.selector.select.company": "কোম্পানি নির্বাচন করুন",
  "layout.company.branch.selector.branch": "শাখা",
  "layout.company.branch.selector.select.branch": "শাখা নির্বাচন করুন",
  "layout.company.branch.selector.switch.button": "পরিবর্তন",
  "layout.company.branch.selector.no.company": "কোনো কোম্পানি নেই",
  "layout.company.branch.selector.branch.required": "শাখা প্রয়োজন",
  "layout.company.branch.selector.please.select.branch":
    "অনুগ্রহ করে একটি শাখা নির্বাচন করুন",

  "layout.topbar.search": "অনুসন্ধান",
  "layout.topbar.search.placeholder": "কন্টেন্ট অনুসন্ধান করুন...",

  "layout.topbar.toggle.menu": "মেনু টগল",
  "layout.topbar.toggle.dark.mode": "ডার্ক মোড টগল",
  "layout.topbar.open.theme.settings": "থিম সেটিংস খুলুন",
  "layout.topbar.more.options": "আরো বিকল্প",

  "layout.configurator.primary": "প্রাথমিক",
  "layout.configurator.surface": "পৃষ্ঠ",
  "layout.configurator.presets": "প্রিসেটস",
  "layout.configurator.menu.mode": "মেনু মোড",
  "layout.configurator.menu.mode.static": "স্ট্যাটিক",
  "layout.configurator.menu.mode.overlay": "ওভারলে",
  "layout.configurator.menu.mode.topbar": "টপবার",

  "layout.footer.by": "দ্বারা",

  "menu.dashboard": "ড্যাশবোর্ড",
  "menu.administration": "প্রশাসন",
  "menu.iam": "আইএএম",
  "menu.storage": "স্টোরেজ",
  "menu.forms": "ফর্ম",
  "menu.email": "ইমেইল",
  "menu.event.manager": "ইভেন্ট ম্যানেজার",
  "menu.notifications": "বিজ্ঞপ্তি",
  "menu.localization": "স্থানীয়করণ",

  "notification.title": "বিজ্ঞপ্তি",

  "notification.mark.all.read": "সব পঠিত হিসেবে চিহ্নিত করুন",
  "notification.view.all": "সমস্ত বিজ্ঞপ্তি দেখুন",
  "notification.empty": "কোনো বিজ্ঞপ্তি নেই",

  "notification.time.just.now": "এইমাত্র",
  "notification.time.minutes.ago": "{{count}} মিনিট আগে",
  "notification.time.hours.ago": "{{count}} ঘন্টা আগে",
  "notification.time.days.ago": "{{count}} দিন আগে",

  "auth.login.success": "লগইন সফল",
  "auth.login.requires.selection":
    "চালিয়ে যেতে অনুগ্রহ করে একটি কোম্পানি ও শাখা নির্বাচন করুন",
  "auth.login.invalid.credentials": "অবৈধ ইমেইল বা পাসওয়ার্ড",
  "auth.login.email.not.verified":
    "লগইন করার আগে অনুগ্রহ করে আপনার ইমেইল যাচাই করুন",
  "auth.login.account.deactivated": "আপনার অ্যাকাউন্ট নিষ্ক্রিয় করা হয়েছে",
  "auth.logout.success": "সফলভাবে লগআউট হয়েছে",
  "auth.register.success": "অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে",
  "auth.register.failed":
    "নিবন্ধন ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
  "auth.refresh.success": "টোকেন সফলভাবে রিফ্রেশ হয়েছে",
  "auth.me.success": "ব্যবহারকারীর তথ্য সফলভাবে পুনরুদ্ধার হয়েছে",
  "auth.select.success": "কোম্পানি সফলভাবে নির্বাচিত হয়েছে",
  "auth.switch.company.success": "কোম্পানি সফলভাবে পরিবর্তিত হয়েছে",
  "auth.register.email.exists": "ইমেইল ইতিমধ্যে বিদ্যমান",
  "auth.register.company.already.assigned": "কোম্পানি ইতিমধ্যে অর্পিত",
  "auth.password.change.success": "পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে",
  "auth.password.change.invalid.current": "বর্তমান পাসওয়ার্ড সঠিক নয়",
  "auth.password.change.current.required": "বর্তমান পাসওয়ার্ড প্রয়োজন",
  "auth.password.reset.email.sent": "পাসওয়ার্ড রিসেট ইমেইল পাঠানো হয়েছে",
  "auth.password.reset.success": "পাসওয়ার্ড সফলভাবে রিসেট হয়েছে",
  "auth.token.expired": "টোকেনের মেয়াদ শেষ হয়েছে",
  "auth.token.revoked": "টোকেন প্রত্যাহার করা হয়েছে",
  "auth.token.too.large": "রিফ্রেশ টোকেন অত্যন্ত বড় (≈{{size}} বাইট)",
  "auth.company.list.success":
    "ব্যবহারকারীর কোম্পানিগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "auth.company.not.found": "কোম্পানি পাওয়া যায়নি",
  "auth.company.required": "কোম্পানি প্রয়োজন",
  "auth.company.feature.not.enabled":
    "এই বৈশিষ্ট্যটি আপনার কোম্পানির জন্য সক্রিয় নয়",
  "auth.branch.list.success": "কোম্পানির শাখাগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "auth.branch.no.access": "এই শাখায় কোনো অ্যাক্সেস নেই",
  "auth.branch.not.found": "শাখা পাওয়া যায়নি",
  "auth.email.not.configured": "ইমেইল সেবা কনফিগার করা নেই",
  "auth.email.send.failed": "ইমেইল পাঠাতে ব্যর্থ",
  "auth.session.invalid": "অবৈধ সেশন। অনুগ্রহ করে আবার লগইন করুন।",
  "auth.session.not.available": "সেশন উপলব্ধ নয়",
  "auth.profile.access.denied": "প্রোফাইলে অ্যাক্সেস অস্বীকৃত",
  "auth.profile.sections.not.supported": "প্রোফাইল বিভাগ সমর্থিত নয়",
  "auth.logout.service.unavailable": "লগআউট সেবা অনুপলব্ধ",
  "auth.password.reset.token.expired":
    "পাসওয়ার্ড রিসেট টোকেনের মেয়াদ শেষ হয়েছে",
  "auth.password.reset.token.used":
    "পাসওয়ার্ড রিসেট টোকেন ইতিমধ্যে ব্যবহৃত হয়েছে",

  "email.verification.sent": "যাচাইকরণ ইমেইল পাঠানো হয়েছে",
  "email.verification.success": "ইমেইল সফলভাবে যাচাই হয়েছে",
  "email.verification.token.invalid": "অবৈধ যাচাইকরণ টোকেন",
  "email.verification.token.expired": "যাচাইকরণ টোকেনের মেয়াদ শেষ হয়েছে",
  "email.verification.not.enabled": "ইমেইল যাচাইকরণ সক্রিয় নয়",
  "email.verification.resend.success":
    "যাচাইকরণ ইমেইল সফলভাবে পুনঃপ্রেরণ করা হয়েছে",

  "auth.session.expired.title": "সেশনের মেয়াদ শেষ",

  "auth.login.welcome": "আবার স্বাগতম!",
  "auth.login.sign.in.to.continue":
    "আপনার অ্যাকাউন্টে চালিয়ে যেতে সাইন ইন করুন",
  "auth.email.label": "ইমেইল ঠিকানা",
  "auth.email.placeholder": "ইমেইল ঠিকানা লিখুন",
  "auth.password.label": "পাসওয়ার্ড",
  "auth.password.placeholder": "আপনার পাসওয়ার্ড লিখুন",
  "auth.field.remember.me": "আমাকে মনে রাখুন",
  "auth.password.forgot": "পাসওয়ার্ড ভুলে গেছেন?",
  "auth.login.sign.in": "সাইন ইন",
  "auth.login.no.account": "অ্যাকাউন্ট নেই?",
  "auth.login.sign.up": "সাইন আপ",
  "auth.login.verify.email.message": "অনুগ্রহ করে আপনার ইমেইল যাচাই করুন!",
  "auth.verify.resend": "যাচাইকরণ ইমেইল পুনঃপ্রেরণ",
  "auth.login.back.to.sign.in": "সাইন ইনে ফিরে যান",
  "auth.login.select.company": "কোম্পানি নির্বাচন করুন",
  "auth.login.select.company.message":
    "চালিয়ে যেতে অনুগ্রহ করে একটি কোম্পানি ও শাখা নির্বাচন করুন",
  "auth.login.select.company.option": "একটি কোম্পানি নির্বাচন করুন",
  "auth.login.branch.label": "শাখা",
  "auth.login.select.branch.option": "একটি শাখা নির্বাচন করুন",
  "auth.login.remember.selection": "আমার নির্বাচন মনে রাখুন",
  "auth.validation.password.min.length": "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে",
  "auth.validation.email.required": "ইমেইল প্রয়োজন",
  "auth.validation.password.required": "পাসওয়ার্ড প্রয়োজন",
  "auth.validation.password.max.length":
    "পাসওয়ার্ড সর্বোচ্চ দৈর্ঘ্য অতিক্রম করেছে",
  "auth.validation.password.pattern": "পাসওয়ার্ড প্রয়োজনীয়তা পূরণ করে না",
  "auth.validation.password.require.uppercase":
    "পাসওয়ার্ডে কমপক্ষে একটি বড় অক্ষর থাকতে হবে",
  "auth.validation.password.require.lowercase":
    "পাসওয়ার্ডে কমপক্ষে একটি ছোট অক্ষর থাকতে হবে",
  "auth.validation.password.require.number":
    "পাসওয়ার্ডে কমপক্ষে একটি সংখ্যা থাকতে হবে",
  "auth.validation.password.require.special":
    "পাসওয়ার্ডে কমপক্ষে একটি বিশেষ অক্ষর থাকতে হবে",
  "auth.validation.company.required": "অনুগ্রহ করে একটি কোম্পানি নির্বাচন করুন",
  "auth.validation.branch.required": "অনুগ্রহ করে একটি শাখা নির্বাচন করুন",
  "auth.login.title": "লগইন",
  "auth.session.expired":
    "আপনার সেশনের মেয়াদ শেষ হয়েছে। অনুগ্রহ করে আবার লগইন করুন।",

  "auth.forgot.password.title": "পাসওয়ার্ড ভুলে গেছেন",
  "auth.forgot.password.subtitle":
    "আপনার ইমেইল ঠিকানা লিখুন এবং আমরা আপনাকে একটি রিসেট লিঙ্ক পাঠাব।",
  "auth.forgot.password.send.reset.link": "রিসেট লিঙ্ক পাঠান",
  "auth.forgot.password.remember.password": "আপনার পাসওয়ার্ড মনে আছে?",
  "auth.forgot.password.check.email": "আপনার ইমেইল চেক করুন",
  "auth.forgot.password.email.sent.to":
    "আমরা {{email}} এ একটি পাসওয়ার্ড রিসেট লিঙ্ক পাঠিয়েছি",
  "auth.forgot.password.didnt.receive": "ইমেইল পাননি?",
  "auth.forgot.password.try.again": "আবার চেষ্টা করুন",

  "auth.register.create.account": "অ্যাকাউন্ট তৈরি করুন",
  "auth.register.subtitle": "অ্যাকাউন্ট তৈরি করতে আপনার বিবরণ পূরণ করুন।",
  "auth.register.full.name": "পূর্ণ নাম",
  "auth.register.name.placeholder": "আপনার পূর্ণ নাম লিখুন",
  "auth.phone.label": "ফোন নম্বর",
  "auth.phone.placeholder": "ফোন নম্বর লিখুন",
  "auth.register.confirm.password": "পাসওয়ার্ড নিশ্চিত করুন",
  "auth.register.confirm.password.placeholder": "আপনার পাসওয়ার্ড নিশ্চিত করুন",
  "auth.register.passwords.do.not.match": "পাসওয়ার্ড মিলছে না",
  "auth.register.company.details": "কোম্পানির বিবরণ",
  "auth.register.join.default.company": "ডিফল্ট কোম্পানিতে যোগদান",
  "auth.register.join.or.create.company": "কোম্পানিতে যোগদান বা তৈরি করুন",
  "auth.register.create.new.company": "নতুন কোম্পানি তৈরি করুন",
  "auth.register.company.code": "কোম্পানি কোড",
  "auth.register.preconfigured.company": "প্রি-কনফিগার্ড কোম্পানি",
  "auth.register.company.code.placeholder": "কোম্পানি কোড লিখুন",
  "auth.register.enter.company.code": "যোগদানের জন্য কোম্পানি কোড লিখুন",
  "auth.register.branch.code": "শাখা কোড",
  "auth.register.preconfigured.branch": "প্রি-কনফিগার্ড শাখা",
  "auth.register.branch.code.placeholder": "শাখা কোড লিখুন",
  "auth.register.company.name": "কোম্পানির নাম",
  "auth.register.company.name.placeholder": "কোম্পানির নাম লিখুন",
  "auth.address.label": "ঠিকানা",
  "auth.address.placeholder": "ঠিকানা লিখুন",
  "auth.register.already.have.account": "ইতিমধ্যে একটি অ্যাকাউন্ট আছে?",
  "auth.validation.name.min.length": "নাম কমপক্ষে {{min}} অক্ষরের হতে হবে",
  "auth.validation.confirm.password.required":
    "অনুগ্রহ করে আপনার পাসওয়ার্ড নিশ্চিত করুন",

  "auth.verify.email.verifying": "ইমেইল যাচাই করা হচ্ছে",
  "auth.verify.email.please.wait":
    "আমরা আপনার ইমেইল ঠিকানা যাচাই করার সময় অনুগ্রহ করে অপেক্ষা করুন...",
  "auth.verify.email.success": "ইমেইল যাচাই হয়েছে",
  "auth.verify.email.success.message":
    "আপনার ইমেইল সফলভাবে যাচাই হয়েছে। আপনি এখন আপনার অ্যাকাউন্টে লগইন করতে পারেন।",
  "auth.verify.email.failed": "যাচাইকরণ ব্যর্থ",
  "auth.verify.email.invalid.link":
    "এই যাচাইকরণ লিঙ্কটি অবৈধ বা মেয়াদ শেষ হয়ে গেছে।",
  "auth.verify.email.resend.email": "যাচাইকরণ ইমেইল পুনঃপ্রেরণ",
  "auth.verify.email.resend.title": "যাচাইকরণ পুনঃপ্রেরণ",
  "auth.verify.email.resend.subtitle":
    "নতুন যাচাইকরণ লিঙ্ক পেতে আপনার ইমেইল লিখুন।",
  "auth.verify.email.resend": "ইমেইল পুনঃপ্রেরণ",
  "auth.verify.email.sent":
    "যাচাইকরণ ইমেইল পাঠানো হয়েছে। অনুগ্রহ করে আপনার ইনবক্স চেক করুন।",

  "auth.reset.password.title": "পাসওয়ার্ড রিসেট",
  "auth.reset.password.subtitle": "নিচে আপনার নতুন পাসওয়ার্ড লিখুন।",
  "auth.reset.password.new.password": "নতুন পাসওয়ার্ড",
  "auth.reset.password.new.password.placeholder": "আপনার নতুন পাসওয়ার্ড লিখুন",
  "auth.reset.password.confirm.password": "পাসওয়ার্ড নিশ্চিত করুন",
  "auth.reset.password.confirm.password.placeholder":
    "আপনার নতুন পাসওয়ার্ড নিশ্চিত করুন",
  "auth.reset.password.reset.password": "পাসওয়ার্ড রিসেট",
  "auth.reset.password.success": "পাসওয়ার্ড রিসেট সফল",
  "auth.reset.password.success.message":
    "আপনার পাসওয়ার্ড সফলভাবে রিসেট হয়েছে। আপনি এখন আপনার নতুন পাসওয়ার্ড দিয়ে লগইন করতে পারেন।",
  "auth.reset.password.invalid.link": "অবৈধ রিসেট লিঙ্ক",
  "auth.reset.password.invalid.link.message":
    "এই পাসওয়ার্ড রিসেট লিঙ্কটি অবৈধ বা মেয়াদ শেষ হয়ে গেছে।",
  "auth.reset.password.request.new.link": "নতুন লিঙ্ক অনুরোধ করুন",

  "user.create.success": "ব্যবহারকারী সফলভাবে তৈরি হয়েছে",
  "user.create.many.success": "{{count}} জন ব্যবহারকারী সফলভাবে তৈরি হয়েছে",
  "user.get.success": "ব্যবহারকারী সফলভাবে পুনরুদ্ধার হয়েছে",
  "user.get.by.ids.success":
    "আইডি অনুসারে ব্যবহারকারীরা সফলভাবে পুনরুদ্ধার হয়েছে",
  "user.update.success": "ব্যবহারকারী সফলভাবে হালনাগাদ হয়েছে",
  "user.update.many.success":
    "{{count}} জন ব্যবহারকারী সফলভাবে হালনাগাদ হয়েছে",
  "user.get.by.filter.success":
    "ফিল্টার অনুসারে ব্যবহারকারীরা সফলভাবে পুনরুদ্ধার হয়েছে",
  "user.get.all.success": "ব্যবহারকারীরা সফলভাবে পুনরুদ্ধার হয়েছে",
  "user.delete.success": "ব্যবহারকারী সফলভাবে মুছে ফেলা হয়েছে",
  "user.restore.success": "ব্যবহারকারী সফলভাবে পুনরুদ্ধার হয়েছে",
  "user.not.found": "ব্যবহারকারী পাওয়া যায়নি",
  "user.profile.update.success": "প্রোফাইল সফলভাবে হালনাগাদ হয়েছে",
  "user.profile.extras.success": "প্রোফাইল এক্সট্রা সফলভাবে পুনরুদ্ধার হয়েছে",
  "user.profile.sections.success":
    "প্রোফাইল বিভাগসমূহ সফলভাবে পুনরুদ্ধার হয়েছে",
  "user.profile.section.data.success":
    "প্রোফাইল বিভাগের তথ্য সফলভাবে পুনরুদ্ধার হয়েছে",
  "user.profile.section.update.success":
    "প্রোফাইল বিভাগ সফলভাবে হালনাগাদ হয়েছে",
  "user.profile.completion.success":
    "প্রোফাইল সম্পূর্ণতা সফলভাবে পুনরুদ্ধার হয়েছে",
  "user.email.verify.success": "ইমেইল সফলভাবে যাচাই হয়েছে",
  "user.phone.verify.success": "ফোন সফলভাবে যাচাই হয়েছে",
  "user.status.update.success": "ব্যবহারকারীর স্থিতি সফলভাবে হালনাগাদ হয়েছে",

  "company.create.success": "কোম্পানি সফলভাবে তৈরি হয়েছে",
  "company.create.many.success": "{{count}}টি কোম্পানি সফলভাবে তৈরি হয়েছে",
  "company.get.success": "কোম্পানি সফলভাবে পুনরুদ্ধার হয়েছে",
  "company.get.by.ids.success":
    "আইডি অনুসারে কোম্পানিগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "company.get.by.filter.success":
    "ফিল্টার অনুসারে কোম্পানিগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "company.update.success": "কোম্পানি সফলভাবে হালনাগাদ হয়েছে",
  "company.update.many.success": "{{count}}টি কোম্পানি সফলভাবে হালনাগাদ হয়েছে",
  "company.get.all.success": "কোম্পানিগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "company.delete.success": "কোম্পানি সফলভাবে মুছে ফেলা হয়েছে",
  "company.restore.success": "কোম্পানি সফলভাবে পুনরুদ্ধার হয়েছে",

  "branch.create.success": "শাখা সফলভাবে তৈরি হয়েছে",
  "branch.create.many.success": "{{count}}টি শাখা সফলভাবে তৈরি হয়েছে",
  "branch.get.success": "শাখা সফলভাবে পুনরুদ্ধার হয়েছে",
  "branch.get.by.ids.success":
    "আইডি অনুসারে শাখাগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "branch.get.by.filter.success":
    "ফিল্টার অনুসারে শাখাগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "branch.update.success": "শাখা সফলভাবে হালনাগাদ হয়েছে",
  "branch.update.many.success": "{{count}}টি শাখা সফলভাবে হালনাগাদ হয়েছে",
  "branch.get.all.success": "শাখাগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "branch.delete.success": "শাখা সফলভাবে মুছে ফেলা হয়েছে",
  "branch.restore.success": "শাখা সফলভাবে পুনরুদ্ধার হয়েছে",

  "user.permission.company.list.success":
    "ব্যবহারকারীর কোম্পানিগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "user.permission.branch.list.success":
    "ব্যবহারকারীর শাখাগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "user.permission.batch.success":
    "{{added}}টি সংযোজন এবং {{removed}}টি অপসারণ প্রক্রিয়া করা হয়েছে",
  "user.permission.already.assigned":
    "ব্যবহারকারী ইতিমধ্যে এই {{type}}-এ অর্পিত",
  "user.permission.not.found": "{{type}} অনুমতি পাওয়া যায়নি",

  "administrative.permission.manage.company": "কোম্পানির অনুমতি ব্যবস্থাপনা",
  "administrative.permission.user": "ব্যবহারকারী",
  "administrative.company.no.companies": "কোনো কোম্পানি পাওয়া যায়নি",

  "administrative.permission.manage.branch": "শাখার অনুমতি ব্যবস্থাপনা",
  "administrative.company.select": "কোম্পানি নির্বাচন করুন",
  "administrative.permission.no.company":
    "এই ব্যবহারকারীর কোনো কোম্পানির অনুমতি অর্পিত নেই।",
  "administrative.permission.assign.company.first":
    "শাখা অ্যাক্সেস ব্যবস্থাপনার আগে প্রথমে কোম্পানির অনুমতি অর্পণ করুন।",
  "administrative.permission.select.company.for.branches":
    "শাখা দেখতে অনুগ্রহ করে একটি কোম্পানি নির্বাচন করুন।",
  "administrative.branch.no.branches": "কোনো শাখা পাওয়া যায়নি",

  "administrative.title": "প্রশাসন",
  "administrative.subtitle": "ব্যবহারকারী, কোম্পানি এবং শাখা ব্যবস্থাপনা করুন",
  "administrative.user.title": "ব্যবহারকারীরা",
  "administrative.company.title": "কোম্পানিসমূহ",
  "administrative.branch.title": "শাখাসমূহ",

  "administrative.branch.new": "নতুন শাখা",
  "administrative.branch.edit": "শাখা সম্পাদনা",
  "administrative.branch.name": "শাখার নাম",
  "administrative.branch.name.placeholder": "শাখার নাম লিখুন",
  "administrative.branch.slug": "শাখা স্লাগ",
  "administrative.branch.slug.placeholder": "শাখা স্লাগ লিখুন",
  "administrative.email.label": "ইমেইল",
  "administrative.email.placeholder": "ইমেইল ঠিকানা লিখুন",
  "administrative.phone.label": "ফোন",
  "administrative.phone.placeholder": "ফোন নম্বর লিখুন",
  "administrative.address.label": "ঠিকানা",
  "administrative.address.placeholder": "ঠিকানা লিখুন",
  "administrative.branch.slug.required": "শাখা স্লাগ প্রয়োজন",

  "administrative.branch.add": "শাখা যোগ করুন",
  "administrative.branch.select.company.first":
    "অনুগ্রহ করে প্রথমে একটি কোম্পানি নির্বাচন করুন",
  "administrative.branch.delete.title": "শাখা মুছুন",

  "administrative.company.edit": "কোম্পানি সম্পাদনা",
  "administrative.company.new": "নতুন কোম্পানি",
  "administrative.company.name": "কোম্পানির নাম",
  "administrative.company.name.placeholder": "কোম্পানির নাম লিখুন",
  "administrative.company.slug": "কোম্পানি স্লাগ",
  "administrative.company.slug.placeholder": "কোম্পানি স্লাগ লিখুন",
  "administrative.company.website": "ওয়েবসাইট",
  "administrative.company.website.placeholder": "ওয়েবসাইট URL লিখুন",
  "administrative.company.slug.required": "কোম্পানি স্লাগ প্রয়োজন",

  "administrative.company.add": "কোম্পানি যোগ করুন",
  "administrative.branch.view.branches": "শাখাসমূহ দেখুন",
  "administrative.company.delete.title": "কোম্পানি মুছুন",

  "administrative.user.edit": "ব্যবহারকারী সম্পাদনা",
  "administrative.user.new": "নতুন ব্যবহারকারী",
  "administrative.user.name": "নাম",
  "administrative.user.name.placeholder": "পূর্ণ নাম লিখুন",
  "administrative.user.password": "পাসওয়ার্ড",
  "administrative.user.password.optional": "(বর্তমান রাখতে ফাঁকা রাখুন)",
  "administrative.user.password.placeholder": "পাসওয়ার্ড লিখুন",
  "administrative.user.email.verified": "ইমেইল যাচাইকৃত",
  "administrative.user.auto.assign.to":
    "নতুন ব্যবহারকারী স্বয়ংক্রিয়ভাবে অর্পিত হবে",

  "administrative.user.add": "ব্যবহারকারী যোগ করুন",
  "administrative.permission.company.permissions": "কোম্পানির অনুমতি",
  "administrative.permission.branch.permissions": "শাখার অনুমতি",
  "administrative.user.no.users": "কোনো ব্যবহারকারী পাওয়া যায়নি",
  "administrative.user.details": "ব্যবহারকারীর বিবরণ",
  "administrative.user.delete.title": "ব্যবহারকারী মুছুন",

  "profile.title": "প্রোফাইল",
  "profile.subtitle": "আপনার অ্যাকাউন্ট সেটিংস এবং পছন্দ ব্যবস্থাপনা করুন।",
  "profile.storage.not.enabled":
    "প্রোফাইল ছবি আপলোড উপলব্ধ নয়। স্টোরেজ সেবা কনফিগার করা নেই।",
  "profile.name.label": "পূর্ণ নাম",
  "profile.name.placeholder": "আপনার পূর্ণ নাম লিখুন",
  "profile.phone.label": "ফোন",
  "profile.phone.placeholder": "ফোন নম্বর লিখুন",
  "profile.additional.info": "অতিরিক্ত তথ্য",
  "profile.employment.info": "কর্মসংস্থানের তথ্য",
  "profile.managed.by.admin": "এই ফিল্ডটি একজন প্রশাসক দ্বারা পরিচালিত।",
  "profile.security": "নিরাপত্তা",
  "profile.current.password": "বর্তমান পাসওয়ার্ড",
  "profile.current.password.placeholder": "বর্তমান পাসওয়ার্ড লিখুন",
  "profile.new.password": "নতুন পাসওয়ার্ড",
  "profile.confirm.password": "নতুন পাসওয়ার্ড নিশ্চিত করুন",
  "profile.confirm.password.placeholder": "নতুন পাসওয়ার্ড নিশ্চিত করুন",
  "profile.change.password": "পাসওয়ার্ড পরিবর্তন",
  "profile.company.branch": "কোম্পানি ও শাখা",
  "profile.branch.label": "শাখা",
  "profile.actions.label": "সরাসরি অ্যাকশন",
  "profile.actions.none.assigned": "কোনো অ্যাকশন অর্পিত নেই",
  "profile.permissions.label": "আমার অনুমতি",
  "profile.roles.label": "ভূমিকা",
  "profile.roles.none.assigned": "কোনো ভূমিকা অর্পিত নেই",

  "action.create.success": "অ্যাকশন সফলভাবে তৈরি হয়েছে",
  "action.create.many.success": "{{count}}টি অ্যাকশন সফলভাবে তৈরি হয়েছে",
  "action.get.success": "অ্যাকশন সফলভাবে পুনরুদ্ধার হয়েছে",
  "action.get.by.ids.success":
    "আইডি অনুসারে অ্যাকশনগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "action.get.by.filter.success":
    "ফিল্টার অনুসারে অ্যাকশনগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "action.get.all.success": "অ্যাকশনগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "action.update.success": "অ্যাকশন সফলভাবে হালনাগাদ হয়েছে",
  "action.update.many.success": "{{count}}টি অ্যাকশন সফলভাবে হালনাগাদ হয়েছে",
  "action.delete.success": "অ্যাকশন সফলভাবে মুছে ফেলা হয়েছে",
  "action.restore.success": "অ্যাকশন সফলভাবে পুনরুদ্ধার হয়েছে",

  "role.create.success": "ভূমিকা সফলভাবে তৈরি হয়েছে",
  "role.create.many.success": "{{count}}টি ভূমিকা সফলভাবে তৈরি হয়েছে",
  "role.get.success": "ভূমিকা সফলভাবে পুনরুদ্ধার হয়েছে",
  "role.get.by.ids.success":
    "আইডি অনুসারে ভূমিকাগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "role.get.by.filter.success":
    "ফিল্টার অনুসারে ভূমিকাগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "role.get.all.success": "ভূমিকাগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "role.update.success": "ভূমিকা সফলভাবে হালনাগাদ হয়েছে",
  "role.update.many.success": "{{count}}টি ভূমিকা সফলভাবে হালনাগাদ হয়েছে",
  "role.delete.success": "ভূমিকা সফলভাবে মুছে ফেলা হয়েছে",
  "role.restore.success": "ভূমিকা সফলভাবে পুনরুদ্ধার হয়েছে",

  "permission.process.success":
    "সফলভাবে {{total}}টি আইটেম প্রক্রিয়া হয়েছে: {{added}}টি যোগ, {{removed}}টি অপসারণ",
  "permission.user.required": "{{method}} এর জন্য ব্যবহারকারী প্রয়োজন",
  "permission.already.exists": "অনুমতি ইতিমধ্যে বিদ্যমান",

  "role.permission.actions.success":
    "ভূমিকার অ্যাকশনগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "role.permission.user.roles.success":
    "ব্যবহারকারীর ভূমিকাগুলো সফলভাবে পুনরুদ্ধার হয়েছে",

  "user.action.permission.get.success":
    "ব্যবহারকারীর অ্যাকশন অনুমতিগুলো সফলভাবে পুনরুদ্ধার হয়েছে",

  "company.action.permission.get.success":
    "কোম্পানির অ্যাকশন অনুমতিগুলো সফলভাবে পুনরুদ্ধার হয়েছে",

  "my.permission.get.success": "অনুমতি সফলভাবে লোড হয়েছে",

  "iam.direct.mode.unavailable":
    "RBAC-শুধু মোডে সরাসরি অনুমতি অর্পণ উপলব্ধ নয়",
  "iam.rbac.mode.unavailable":
    "সরাসরি-শুধু মোডে ভূমিকা-ভিত্তিক অনুমতি অর্পণ উপলব্ধ নয়",
  "iam.role.assignment.unavailable": "সরাসরি-শুধু মোডে ভূমিকা অর্পণ উপলব্ধ নয়",

  "iam.title": "পরিচয় ও অ্যাক্সেস ব্যবস্থাপনা",
  "iam.subtitle": "ভূমিকা, অনুমতি এবং অ্যাক্সেস নিয়ন্ত্রণ ব্যবস্থাপনা করুন",
  "iam.action.title": "অ্যাকশনসমূহ",
  "iam.role.title": "ভূমিকাসমূহ",
  "iam.permission.title": "অনুমতিসমূহ",

  "iam.action.new": "নতুন অ্যাকশন",
  "iam.action.name": "অ্যাকশনের নাম",
  "iam.action.code": "অ্যাকশন কোড",
  "iam.action.type": "ধরন",
  "iam.action.no.actions": "কোনো অ্যাকশন পাওয়া যায়নি",
  "iam.action.type.backend": "ব্যাকএন্ড",
  "iam.action.type.frontend": "ফ্রন্টএন্ড",
  "iam.action.type.both": "উভয়",
  "iam.action.delete.title": "অ্যাকশন মুছুন",

  "iam.action.edit": "অ্যাকশন সম্পাদনা",
  "iam.action.name.placeholder": "অ্যাকশনের নাম লিখুন",
  "iam.action.code.placeholder": "অ্যাকশন কোড লিখুন",
  "iam.action.parent": "প্যারেন্ট অ্যাকশন",
  "iam.action.select.parent": "প্যারেন্ট অ্যাকশন নির্বাচন করুন",
  "iam.action.type.backend.label": "শুধু ব্যাকএন্ড",
  "iam.action.type.frontend.label": "শুধু ফ্রন্টএন্ড",
  "iam.action.type.both.label": "ব্যাকএন্ড ও ফ্রন্টএন্ড",

  "iam.company.title": "কোম্পানিসমূহ",
  "iam.role.new": "নতুন ভূমিকা",
  "iam.role.name": "ভূমিকার নাম",
  "iam.role.no.roles": "কোনো ভূমিকা পাওয়া যায়নি",
  "iam.role.delete.title": "ভূমিকা মুছুন",

  "iam.role.edit": "ভূমিকা সম্পাদনা",
  "iam.role.name.placeholder": "ভূমিকার নাম লিখুন",

  "iam.permission.role.actions": "ভূমিকার অ্যাকশন",
  "iam.permission.user.roles": "ব্যবহারকারীর ভূমিকা",
  "iam.permission.user.actions": "ব্যবহারকারীর অ্যাকশন",
  "iam.permission.company.actions": "কোম্পানির অ্যাকশন",

  "iam.logic.title": "অনুমতি যুক্তি",
  "iam.logic.add.logic": "যুক্তি যোগ করুন",
  "iam.logic.clear.logic": "যুক্তি পরিষ্কার করুন",
  "iam.logic.description":
    "অ্যাকশন সহ AND/OR যুক্তি ব্যবহার করে অনুমতির প্রয়োজনীয়তা সংজ্ঞায়িত করুন",
  "iam.logic.click.to.toggle": "টগল করতে ক্লিক করুন",
  "iam.logic.conditions": "{{count}}টি শর্ত",
  "iam.logic.select.action": "অ্যাকশন নির্বাচন করুন...",
  "iam.logic.actions.available": "{{count}}টি উপলব্ধ",
  "iam.logic.add.condition": "শর্ত যোগ করুন:",
  "iam.logic.group": "গ্রুপ",
  "iam.logic.action": "অ্যাকশন",

  "iam.permission.select.role": "ভূমিকা নির্বাচন করুন",
  "iam.permission.select.role.placeholder":
    "একটি ভূমিকা অনুসন্ধান করুন এবং নির্বাচন করুন",
  "iam.permission.action.permissions": "অ্যাকশন অনুমতি",
  "iam.permission.actions.available": "{{count}}টি অ্যাকশন উপলব্ধ",
  "iam.validation.warning.title": "যাচাইকরণ সতর্কতা",
  "iam.validation.unmet.prerequisites.plural":
    "{{count}}টি নির্বাচিত অ্যাকশনের অপূর্ণ পূর্বশর্ত রয়েছে। সংরক্ষণের আগে ঠিক করুন বা সংরক্ষণে স্বয়ংক্রিয়-ঠিকাকরণ ব্যবহার করুন।",
  "iam.validation.unmet.prerequisites.singular":
    "{{count}}টি নির্বাচিত অ্যাকশনের অপূর্ণ পূর্বশর্ত রয়েছে। সংরক্ষণের আগে ঠিক করুন বা সংরক্ষণে স্বয়ংক্রিয়-ঠিকাকরণ ব্যবহার করুন।",
  "iam.permission.requirements": "প্রয়োজনীয়তা",
  "iam.validation.unmet.prerequisites.tooltip":
    "এই অ্যাকশনের অপূর্ণ পূর্বশর্ত রয়েছে এবং সংরক্ষণে যাচাইকরণ ব্যর্থ হবে",
  "iam.permission.has.prerequisites": "পূর্বশর্ত রয়েছে",
  "iam.permission.no.actions.available": "কোনো অ্যাকশন উপলব্ধ নেই",
  "iam.permission.no.actions.for.role":
    "এই ভূমিকার জন্য কোনো অ্যাকশন উপলব্ধ নেই",
  "iam.tooltip.remove.action": "সরাতে ক্লিক করুন",
  "iam.tooltip.add.action":
    "যোগ করতে ক্লিক করুন (প্রয়োজনীয় স্বয়ংক্রিয়-নির্বাচন)",
  "iam.tooltip.assigned.to.role": "ভূমিকায় অর্পিত",
  "iam.tooltip.click.to.remove.role": "সরাতে ক্লিক করুন",
  "iam.tooltip.click.to.assign.role": "ভূমিকায় অর্পণ করতে ক্লিক করুন",

  "iam.permission.select.user": "ব্যবহারকারী নির্বাচন করুন",
  "iam.permission.select.user.placeholder":
    "একটি ব্যবহারকারী অনুসন্ধান করুন এবং নির্বাচন করুন",
  "iam.permission.select.branch": "শাখা নির্বাচন করুন",
  "iam.permission.select.branch.placeholder":
    "একটি শাখা অনুসন্ধান করুন এবং নির্বাচন করুন",
  "iam.branch.permitted.count.plural":
    "বর্তমান কোম্পানিতে {{count}}টি অনুমোদিত শাখা",
  "iam.branch.permitted.count": "বর্তমান কোম্পানিতে {{count}}টি অনুমোদিত শাখা",
  "iam.permission.direct.action.permissions": "সরাসরি অ্যাকশন অনুমতি",
  "iam.permission.no.actions.for.user":
    "এই ব্যবহারকারীর জন্য কোনো অ্যাকশন উপলব্ধ নেই",
  "iam.tooltip.assigned.to.user": "ব্যবহারকারীতে অর্পিত",
  "iam.tooltip.click.to.remove.user": "সরাসরি অনুমতি সরাতে ক্লিক করুন",
  "iam.tooltip.click.to.assign.user": "সরাসরি অনুমতি অর্পণ করতে ক্লিক করুন",
  "iam.permission.company.required":
    "অনুগ্রহ করে প্রথমে একটি কোম্পানি নির্বাচন করুন",

  "iam.permission.select.company": "কোম্পানি নির্বাচন করুন",
  "iam.permission.select.company.placeholder":
    "একটি কোম্পানি অনুসন্ধান করুন এবং নির্বাচন করুন",
  "iam.permission.action.whitelist": "অ্যাকশন হোয়াইটলিস্ট",
  "iam.permission.no.actions.for.company":
    "এই কোম্পানির জন্য কোনো অ্যাকশন উপলব্ধ নেই",
  "iam.tooltip.selected": "নির্বাচিত",
  "iam.tooltip.click.to.remove": "কোম্পানি হোয়াইটলিস্ট থেকে সরাতে ক্লিক করুন",
  "iam.tooltip.click.to.add": "কোম্পানি হোয়াইটলিস্টে যোগ করতে ক্লিক করুন",
  "iam.permission.requires": "প্রয়োজন",
  "iam.permission.prerequisite.validation.failed": "পূর্বশর্ত যাচাইকরণ ব্যর্থ",
  "iam.permission.prerequisite.error.message":
    "নিম্নলিখিত অ্যাকশনগুলোর অপূর্ণ পূর্বশর্ত রয়েছে:",
  "iam.permission.auto.select.required": "স্বয়ংক্রিয়-নির্বাচন প্রয়োজনীয়",
  "iam.permission.actions.selected": "অ্যাকশন নির্বাচিত",
  "iam.permission.auto.selected.prerequisites":
    "প্রয়োজনীয় পূর্বশর্ত স্বয়ংক্রিয়ভাবে নির্বাচিত হয়েছে। পরিবর্তন প্রয়োগ করতে সংরক্ষণে ক্লিক করুন।",
  "iam.permission.changes.reverted": "পরিবর্তন ফেরানো হয়েছে",
  "iam.permission.selection.reverted":
    "নির্বাচন প্রাথমিক অবস্থায় ফেরানো হয়েছে।",

  "iam.permission.role.assignments": "ভূমিকা অর্পণ",
  "iam.permission.roles.available": "{{count}}টি ভূমিকা উপলব্ধ",
  "iam.pagination.roles.template":
    "{totalRecords}টি ভূমিকার মধ্যে {first} থেকে {last} দেখানো হচ্ছে",
  "iam.permission.no.roles.available": "কোনো ভূমিকা উপলব্ধ নেই",
  "iam.permission.no.roles.for.user":
    "এই ব্যবহারকারীর জন্য কোনো ভূমিকা উপলব্ধ নেই",
  "iam.tooltip.click.to.remove.role.from.user": "ভূমিকা সরাতে ক্লিক করুন",
  "iam.tooltip.click.to.assign.role.to.user":
    "ব্যবহারকারীতে ভূমিকা অর্পণ করতে ক্লিক করুন",

  "iam.logic.unknown.action": "অজানা অ্যাকশন",
  "iam.logic.validation.failed": "যাচাইকরণ ব্যর্থ",
  "iam.logic.validation.failed.message":
    "নিম্নলিখিত অ্যাকশনগুলোর অপূর্ণ পূর্বশর্ত রয়েছে:",
  "iam.logic.validation.failed.prompt": "আপনি কি চান:",
  "iam.logic.auto.fix": "স্বয়ংক্রিয়-ঠিকাকরণ (অবৈধ সরান)",
  "iam.logic.invalid.actions.removed": "অবৈধ অ্যাকশন সরানো হয়েছে",
  "iam.logic.removed.actions.detail":
    "অপূর্ণ পূর্বশর্ত সহ {{count}}টি অ্যাকশন সরানো হয়েছে। আপনি এখন সংরক্ষণ করতে পারেন।",
  "iam.logic.save.cancelled": "সংরক্ষণ বাতিল",
  "iam.logic.fix.prerequisites.manually":
    "অনুগ্রহ করে সংরক্ষণের আগে ম্যানুয়ালি পূর্বশর্ত ঠিক করুন",
  "iam.logic.prerequisites.satisfied": "[OK] পূর্বশর্ত পূরণ",
  "iam.logic.all.required.selected":
    "সমস্ত প্রয়োজনীয় অ্যাকশন ইতিমধ্যে নির্বাচিত।\nআপনি নিরাপদে এই অ্যাকশন যোগ করতে পারেন।",
  "iam.logic.prerequisites.required":
    "পূর্বশর্ত প্রয়োজন ({{count}}টি অনুপস্থিত)",
  "iam.logic.click.to.auto.select":
    "প্রয়োজনীয় অ্যাকশন স্বয়ংক্রিয়-নির্বাচন করতে ক্লিক করুন",
  "iam.logic.select.action.label": "অ্যাকশন নির্বাচন করুন",
  "iam.logic.auto.select.actions": "স্বয়ংক্রিয়-নির্বাচন অ্যাকশন",
  "iam.logic.action.selected.detail":
    "অ্যাকশন সফলভাবে নির্বাচিত (পূর্বশর্ত ইতিমধ্যে পূরণ)",
  "iam.logic.auto.selected.detail":
    "পূর্বশর্ত সহ {{count}}টি অ্যাকশন স্বয়ংক্রিয়ভাবে নির্বাচিত",
  "iam.logic.minimum.required": " (ন্যূনতম প্রয়োজন)",
  "iam.logic.auto.select.prompt":
    "স্বয়ংক্রিয়-নির্বাচন {{count}}টি অ্যাকশন{{suffix}} বেছে নেবে।",
  "iam.logic.missing.prerequisites": "অনুপস্থিত পূর্বশর্ত",
  "iam.logic.requires.conditions": "নিম্নলিখিত শর্তগুলো পূরণ করা প্রয়োজন:",
  "iam.logic.would.you.continue": "আপনি কি চালিয়ে যেতে চান?",
  "iam.logic.actions.selected.summary": "অ্যাকশন নির্বাচিত",
  "iam.logic.selection.cancelled": "নির্বাচন বাতিল",
  "iam.logic.action.not.added": "অ্যাকশন হোয়াইটলিস্টে যোগ করা হয়নি",
  "iam.logic.required.by.actions": "নিম্নলিখিত অ্যাকশন দ্বারা প্রয়োজনীয়:",
  "iam.logic.alternatives.available": "বিকল্প অপশন উপলব্ধ:",
  "iam.logic.switch.to.alternatives":
    "আপনি কি স্বয়ংক্রিয়ভাবে বিকল্পে স্যুইচ করতে চান?",
  "iam.logic.remove.dependents": "এটি সরালে নির্ভরশীল অ্যাকশনগুলোও সরে যাবে।",
  "iam.logic.dependency.warning": "নির্ভরতা সতর্কতা",
  "iam.logic.use.alternatives": "বিকল্প ব্যবহার করুন",
  "iam.logic.remove.all": "সব সরান",
  "iam.logic.alternatives.applied": "বিকল্প প্রয়োগ করা হয়েছে",
  "iam.logic.switched.to.alternatives":
    "স্বয়ংক্রিয়ভাবে বিকল্প অ্যাকশনে স্যুইচ হয়েছে",
  "iam.logic.actions.removed": "অ্যাকশন সরানো হয়েছে",
  "iam.logic.removed.with.dependents":
    "{{name}} এবং {{count}}টি নির্ভরশীল অ্যাকশন সরানো হয়েছে",
  "iam.logic.cancelled": "বাতিল",
  "iam.logic.no.changes.made": "কোনো পরিবর্তন করা হয়নি",
  "iam.logic.satisfied": "(পূরণ)",
  "iam.logic.missing": "(অনুপস্থিত)",
  "iam.logic.invalid.node": "অবৈধ যুক্তি নোড",
  "iam.logic.invalid": "(অবৈধ)",

  "file.create.success": "ফাইল সফলভাবে তৈরি হয়েছে",
  "file.create.many.success": "{{count}}টি ফাইল সফলভাবে তৈরি হয়েছে",
  "file.get.success": "ফাইল সফলভাবে পুনরুদ্ধার হয়েছে",
  "file.get.by.ids.success": "আইডি অনুসারে ফাইলগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "file.get.by.filter.success":
    "ফিল্টার অনুসারে ফাইলগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "file.get.all.success": "ফাইলগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "file.update.success": "ফাইল সফলভাবে হালনাগাদ হয়েছে",
  "file.update.many.success": "{{count}}টি ফাইল সফলভাবে হালনাগাদ হয়েছে",
  "file.delete.success": "ফাইল সফলভাবে মুছে ফেলা হয়েছে",
  "file.restore.success": "ফাইল সফলভাবে পুনরুদ্ধার হয়েছে",
  "file.not.found": "ফাইল পাওয়া যায়নি",

  "folder.create.success": "ফোল্ডার সফলভাবে তৈরি হয়েছে",
  "folder.create.many.success": "{{count}}টি ফোল্ডার সফলভাবে তৈরি হয়েছে",
  "folder.get.success": "ফোল্ডার সফলভাবে পুনরুদ্ধার হয়েছে",
  "folder.get.by.ids.success":
    "আইডি অনুসারে ফোল্ডারগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "folder.get.by.filter.success":
    "ফিল্টার অনুসারে ফোল্ডারগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "folder.get.all.success": "ফোল্ডারগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "folder.update.success": "ফোল্ডার সফলভাবে হালনাগাদ হয়েছে",
  "folder.update.many.success": "{{count}}টি ফোল্ডার সফলভাবে হালনাগাদ হয়েছে",
  "folder.delete.success": "ফোল্ডার সফলভাবে মুছে ফেলা হয়েছে",
  "folder.restore.success": "ফোল্ডার সফলভাবে পুনরুদ্ধার হয়েছে",
  "folder.not.found": "ফোল্ডার পাওয়া যায়নি",

  "storage.config.create.success": "স্টোরেজ কনফিগারেশন সফলভাবে তৈরি হয়েছে",
  "storage.config.create.many.success":
    "{{count}}টি স্টোরেজ কনফিগারেশন সফলভাবে তৈরি হয়েছে",
  "storage.config.get.success": "স্টোরেজ কনফিগারেশন সফলভাবে পুনরুদ্ধার হয়েছে",
  "storage.config.get.by.ids.success":
    "আইডি অনুসারে স্টোরেজ কনফিগারেশনগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "storage.config.get.by.filter.success":
    "ফিল্টার অনুসারে স্টোরেজ কনফিগারেশনগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "storage.config.get.all.success":
    "স্টোরেজ কনফিগারেশনগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "storage.config.update.success": "স্টোরেজ কনফিগারেশন সফলভাবে হালনাগাদ হয়েছে",
  "storage.config.update.many.success":
    "{{count}}টি স্টোরেজ কনফিগারেশন সফলভাবে হালনাগাদ হয়েছে",
  "storage.config.delete.success":
    "স্টোরেজ কনফিগারেশন সফলভাবে মুছে ফেলা হয়েছে",
  "storage.config.restore.success":
    "স্টোরেজ কনফিগারেশন সফলভাবে পুনরুদ্ধার হয়েছে",

  "upload.success": "ফাইল সফলভাবে আপলোড হয়েছে",
  "upload.many.success": "ফাইলগুলো সফলভাবে আপলোড হয়েছে",
  "upload.file.too.large":
    "ফাইলের আকার ({{fileSize}}MB) সর্বোচ্চ {{maxSize}}MB অতিক্রম করেছে",
  "upload.invalid.type":
    'ফাইল টাইপ "{{mimeType}}" অনুমোদিত নয়। অনুমোদিত: {{allowedTypes}}',
  "upload.no.files.provided": "কোনো ফাইল প্রদান করা হয়নি",
  "upload.no.file.path": "ফাইল পাথ প্রয়োজন",
  "upload.invalid.file.path": "অবৈধ ফাইল পাথ",
  "upload.config.not.found": "আপলোড কনফিগারেশন পাওয়া যায়নি",

  "storage.title": "স্টোরেজ",
  "storage.subtitle": "ফাইল, ফোল্ডার এবং স্টোরেজ কনফিগারেশন ব্যবস্থাপনা করুন",
  "storage.file.title": "ফাইলসমূহ",
  "storage.folder.title": "ফোল্ডার সেটআপ",
  "storage.config.title": "স্টোরেজ কনফিগারেশনসমূহ",

  "storage.button.new.configuration": "নতুন কনফিগারেশন",
  "storage.table.provider": "প্রদানকারী",
  "storage.table.created": "তৈরি হয়েছে",
  "storage.empty.configs.in.company":
    "বর্তমান কোম্পানিতে কোনো স্টোরেজ কনফিগারেশন পাওয়া যায়নি",
  "storage.empty.configs": "কোনো স্টোরেজ কনফিগারেশন পাওয়া যায়নি",
  "storage.config.load.failed": "স্টোরেজ কনফিগারেশন লোড করতে ব্যর্থ",
  "storage.config.delete.title": "কনফিগারেশন মুছুন",

  "storage.config.edit.config": "স্টোরেজ কনফিগারেশন সম্পাদনা",
  "storage.config.new.config": "নতুন কনফিগারেশন",
  "storage.config.config.name.required": "কনফিগারেশনের নাম *",
  "storage.config.config.name.placeholder": "যেমন, প্রোডাকশন AWS S3",
  "storage.config.provider.required": "স্টোরেজ প্রদানকারী *",
  "storage.set.as.default": "ডিফল্ট হিসেবে সেট করুন",
  "storage.aws.title": "AWS S3 কনফিগারেশন",
  "storage.config.region.required": "AWS অঞ্চল *",
  "storage.aws.region.placeholder": "us-east-1",
  "storage.config.bucket.required": "বাকেটের নাম *",
  "storage.aws.bucket.placeholder": "my-bucket",
  "storage.config.access.key.required": "অ্যাক্সেস কী আইডি *",
  "storage.config.secret.key.required": "সিক্রেট অ্যাক্সেস কী *",
  "storage.config.endpoint.optional": "কাস্টম এন্ডপয়েন্ট (ঐচ্ছিক)",
  "storage.config.endpoint.placeholder": "https://s3.custom-endpoint.com",
  "storage.azure.title": "Azure Blob কনফিগারেশন",
  "storage.azure.account.name.required": "অ্যাকাউন্টের নাম *",
  "storage.azure.container.name.required": "কন্টেইনারের নাম *",
  "storage.azure.account.key.required": "অ্যাকাউন্ট কী *",
  "storage.sftp.title": "SFTP কনফিগারেশন",
  "storage.sftp.host.required": "হোস্ট *",
  "storage.sftp.host.placeholder": "sftp.example.com",
  "storage.sftp.port.required": "পোর্ট *",
  "storage.sftp.port.placeholder": "22",
  "storage.sftp.username.required": "ইউজারনেম *",
  "storage.sftp.password.required": "পাসওয়ার্ড *",
  "storage.sftp.base.path.required": "বেস পাথ *",
  "storage.sftp.base.path.placeholder": "/uploads",
  "storage.local.title": "স্থানীয় স্টোরেজ কনফিগারেশন",
  "storage.local.base.path.required": "বেস পাথ *",
  "storage.local.base.path.placeholder": "/var/www/uploads",
  "storage.config.endpoint": "এন্ডপয়েন্ট URL",
  "storage.validation.config.name.required": "কনফিগারেশনের নাম প্রয়োজন",

  "storage.file.manager.title": "ফাইল ম্যানেজার",
  "storage.button.upload.file": "ফাইল আপলোড",
  "storage.table.size": "আকার",
  "storage.table.location": "অবস্থান",
  "storage.table.config": "কনফিগ",
  "storage.table.private": "ব্যক্তিগত",
  "storage.private": "ব্যক্তিগত",
  "storage.public": "পাবলিক",
  "storage.tooltip.trash": "ট্র্যাশ",
  "storage.empty.files.in.company":
    "বর্তমান কোম্পানিতে কোনো ফাইল পাওয়া যায়নি",
  "storage.empty.files": "কোনো ফাইল পাওয়া যায়নি",
  "storage.file.url.not.available": "ফাইল URL উপলব্ধ নয়",
  "storage.delete.move.to.trash.confirm":
    '"{{name}}" ট্র্যাশে সরান? আপনি পরে এটি পুনরুদ্ধার করতে পারেন।',
  "storage.delete.move.to.trash": "ট্র্যাশে সরান",
  "storage.delete.permanent.delete.confirm":
    '"{{name}}" স্থায়ীভাবে মুছবেন? এই ক্রিয়াটি পূর্বাবস্থায় ফেরানো যাবে না এবং স্টোরেজ থেকে ফাইলটি মুছে ফেলবে।',
  "storage.delete.permanent.delete": "স্থায়ী মুছে ফেলা",
  "storage.delete.permanent.delete.button": "স্থায়ীভাবে মুছুন",

  "storage.file.manager.edit.file": "ফাইল সম্পাদনা",
  "storage.file.manager.upload.file": "ফাইল আপলোড",
  "storage.config.select.config": "স্টোরেজ কনফিগারেশন নির্বাচন করুন...",
  "storage.config.no.configs":
    "কোনো স্টোরেজ কনফিগারেশন পাওয়া যায়নি। অনুগ্রহ করে প্রথমে একটি তৈরি করুন।",
  "storage.folder.optional": "ফোল্ডার (ঐচ্ছিক)",
  "storage.folder.no.folder": "কোনো ফোল্ডার নেই (রুট স্তর)",
  "storage.folder.no.folders.available":
    "কোনো ফোল্ডার উপলব্ধ নেই। ফাইল রুট স্তরে আপলোড হবে।",
  "storage.folder.no.folders.edit": "কোনো ফোল্ডার উপলব্ধ নেই।",
  "storage.file.select.required": "ফাইল নির্বাচন করুন *",
  "storage.button.choose.file": "ফাইল বেছে নিন",
  "storage.upload.drag.drop":
    "এখানে ফাইল টেনে ছাড়ুন বা ব্রাউজ করতে ক্লিক করুন",
  "storage.upload.max.size": "সর্বোচ্চ ফাইল আকার: {{size}}",
  "storage.upload.please.select":
    "অনুগ্রহ করে আপলোড করতে একটি ফাইল নির্বাচন করুন",
  "storage.file.name.required": "ফাইলের নাম *",
  "storage.file.placeholder.edit": "ফাইলের নাম লিখুন",
  "storage.file.placeholder": "নির্বাচিত ফাইল থেকে স্বয়ংক্রিয়ভাবে পূরণ হবে",
  "storage.file.private": "ব্যক্তিগত ফাইল",
  "storage.file.private.hint":
    "শুধু অনুমতিপ্রাপ্ত ব্যবহারকারীরাই অ্যাক্সেস করতে পারবেন",
  "storage.file.public.hint": "ফাইল সর্বসাধারণের জন্য অ্যাক্সেসযোগ্য",
  "storage.validation.file.name.required": "ফাইলের নাম প্রয়োজন",
  "storage.error.no.file": "অনুগ্রহ করে একটি ফাইল নির্বাচন করুন",
  "storage.error.no.config":
    "অনুগ্রহ করে একটি স্টোরেজ কনফিগারেশন নির্বাচন করুন",
  "storage.upload.failed": "ফাইল আপলোড করতে ব্যর্থ",

  "storage.button.new.folder": "নতুন ফোল্ডার",
  "storage.table.slug": "স্লাগ",
  "storage.empty.folders.in.company":
    "বর্তমান কোম্পানিতে কোনো ফোল্ডার পাওয়া যায়নি",
  "storage.empty.folders": "কোনো ফোল্ডার পাওয়া যায়নি",
  "storage.folder.delete.title": "ফোল্ডার মুছুন",

  "storage.folder.edit.folder": "ফোল্ডার সম্পাদনা",
  "storage.folder.new.folder": "নতুন ফোল্ডার",
  "storage.folder.name.required": "ফোল্ডারের নাম *",
  "storage.folder.name.placeholder": "ফোল্ডারের নাম লিখুন",
  "storage.validation.folder.name.required": "ফোল্ডারের নাম প্রয়োজন",

  "storage.delete.this.item": "এই আইটেমটি",

  "storage.size.bytes": "বাইট",
  "storage.size.gb": "GB",

  "email.config.create.success": "ইমেইল কনফিগারেশন সফলভাবে তৈরি হয়েছে",
  "email.config.create.many.success":
    "{{count}}টি ইমেইল কনফিগারেশন সফলভাবে তৈরি হয়েছে",
  "email.config.get.success": "ইমেইল কনফিগারেশন সফলভাবে পুনরুদ্ধার হয়েছে",
  "email.config.get.all.success":
    "ইমেইল কনফিগারেশনগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "email.config.get.by.ids.success":
    "আইডি অনুসারে ইমেইল কনফিগারেশনগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "email.config.get.by.filter.success":
    "ফিল্টার অনুসারে ইমেইল কনফিগারেশনগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "email.config.update.success": "ইমেইল কনফিগারেশন সফলভাবে হালনাগাদ হয়েছে",
  "email.config.update.many.success":
    "{{count}}টি ইমেইল কনফিগারেশন সফলভাবে হালনাগাদ হয়েছে",
  "email.config.delete.success": "ইমেইল কনফিগারেশন সফলভাবে মুছে ফেলা হয়েছে",
  "email.config.restore.success": "ইমেইল কনফিগারেশন সফলভাবে পুনরুদ্ধার হয়েছে",

  "email.template.create.success": "ইমেইল টেমপ্লেট সফলভাবে তৈরি হয়েছে",
  "email.template.update.success": "ইমেইল টেমপ্লেট সফলভাবে হালনাগাদ হয়েছে",
  "email.template.delete.success": "ইমেইল টেমপ্লেট সফলভাবে মুছে ফেলা হয়েছে",
  "email.template.get.success": "ইমেইল টেমপ্লেট সফলভাবে পুনরুদ্ধার হয়েছে",
  "email.template.get.by.ids.success":
    "আইডি অনুসারে ইমেইল টেমপ্লেটগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "email.template.get.by.filter.success":
    "ফিল্টার অনুসারে ইমেইল টেমপ্লেটগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "email.template.get.all.success":
    "ইমেইল টেমপ্লেটগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "email.template.create.many.success":
    "{{count}}টি ইমেইল টেমপ্লেট সফলভাবে তৈরি হয়েছে",
  "email.template.update.many.success":
    "{{count}}টি ইমেইল টেমপ্লেট সফলভাবে হালনাগাদ হয়েছে",
  "email.template.restore.success": "ইমেইল টেমপ্লেট সফলভাবে পুনরুদ্ধার হয়েছে",
  "email.template.not.found": "ইমেইল টেমপ্লেট পাওয়া যায়নি",

  "email.send.success": "ইমেইল সফলভাবে পাঠানো হয়েছে",
  "email.send.failed": "ইমেইল পাঠাতে ব্যর্থ",
  "email.send.config.not.found": "ইমেইল কনফিগারেশন পাওয়া যায়নি",
  "email.send.config.inactive": "ইমেইল কনফিগারেশন নিষ্ক্রিয়",
  "email.send.config.default.not.found":
    "ডিফল্ট ইমেইল কনফিগারেশন পাওয়া যায়নি",
  "email.send.template.not.found": "ইমেইল টেমপ্লেট পাওয়া যায়নি",
  "email.send.template.inactive": "ইমেইল টেমপ্লেট নিষ্ক্রিয়",
  "email.send.template.id.or.slug.required": "টেমপ্লেট আইডি বা স্লাগ প্রয়োজন",

  "email.template.untitled": "শিরোনামহীন টেমপ্লেট",
  "email.section.header": "হেডার",
  "email.section.body": "মূল অংশ",
  "email.section.footer": "ফুটার",

  "email.title": "ইমেইল ব্যবস্থাপনা",
  "email.subtitle": "ইমেইল কনফিগারেশন এবং টেমপ্লেট ব্যবস্থাপনা করুন",
  "email.template.title": "ইমেইল টেমপ্লেটসমূহ",
  "email.config.title": "ইমেইল কনফিগারেশনসমূহ",

  "email.config.edit.title": "ইমেইল কনফিগারেশন সম্পাদনা",
  "email.config.new.title": "নতুন ইমেইল কনফিগারেশন",
  "email.config.name": "কনফিগারেশনের নাম",
  "email.config.name.example": "যেমন, প্রোডাকশন SMTP",
  "email.config.provider": "প্রদানকারী",
  "email.config.select.provider": "প্রদানকারী নির্বাচন করুন",
  "email.config.from.email": "প্রেরকের ইমেইল",
  "email.config.from.email.example": "noreply@example.com",
  "email.config.from.name": "প্রেরকের নাম",
  "email.config.from.name.example": "আপনার অ্যাপের নাম",
  "email.config.set.as.default": "ডিফল্ট হিসেবে সেট করুন",
  "email.config.smtp.settings": "SMTP সেটিংস",
  "email.config.smtp.host": "SMTP হোস্ট",
  "email.config.smtp.host.example": "smtp.gmail.com",
  "email.config.port": "পোর্ট",
  "email.config.smtp.port.example": "587",
  "email.config.username": "ইউজারনেম",
  "email.config.smtp.user.example": "user@gmail.com",
  "email.config.password": "পাসওয়ার্ড",
  "email.config.smtp.password.example": "অ্যাপ পাসওয়ার্ড",
  "email.config.use.ssl.tls": "SSL/TLS ব্যবহার করুন",
  "email.config.sendgrid.settings": "SendGrid সেটিংস",
  "email.config.api.key": "API কী",
  "email.config.api.key.example": "API কী",
  "email.config.mailgun.settings": "Mailgun সেটিংস",
  "email.config.domain": "ডোমেইন",
  "email.config.domain.example": "mg.example.com",
  "email.config.region": "অঞ্চল",
  "email.config.select.region": "অঞ্চল নির্বাচন করুন",
  "email.provider.smtp": "SMTP",
  "email.provider.sendgrid": "SendGrid",
  "email.provider.mailgun": "Mailgun",
  "email.region.us": "US",
  "email.region.eu": "EU",

  "email.config.new": "নতুন কনফিগারেশন",
  "email.config.empty": "কোনো ইমেইল কনফিগারেশন পাওয়া যায়নি",
  "email.config.test.dialog.title": "ইমেইল কনফিগারেশন পরীক্ষা",
  "email.config.configuration": "কনফিগারেশন",
  "email.config.recipient.email": "প্রাপকের ইমেইল",
  "email.recipient.example": "recipient@example.com",
  "email.config.test.dialog.hint":
    "কনফিগারেশন যাচাই করতে একটি পরীক্ষা ইমেইল পাঠানো হবে",
  "email.config.send.test": "পরীক্ষা পাঠান",
  "email.config.enter.recipient":
    "অনুগ্রহ করে একটি প্রাপকের ইমেইল ঠিকানা লিখুন",
  "email.config.delete.title": "কনফিগারেশন মুছুন",
  "email.config.test": "কনফিগারেশন পরীক্ষা",

  "email.template.edit.title": "ইমেইল টেমপ্লেট সম্পাদনা",
  "email.template.new.title": "নতুন ইমেইল টেমপ্লেট",
  "email.template.name": "টেমপ্লেটের নাম",
  "email.template.name.example": "যেমন, স্বাগত ইমেইল",
  "email.template.slug": "স্লাগ",
  "email.template.slug.example": "যেমন, welcome-email",
  "email.template.subject": "বিষয়",
  "email.template.subject.example": "ইমেইলের বিষয় লিখুন",
  "email.template.variable.hint":
    "গতিশীল কন্টেন্টের জন্য {{variableName}} ব্যবহার করুন",
  "email.template.desc": "বিবরণ",
  "email.template.desc.placeholder": "টেমপ্লেটের সংক্ষিপ্ত বিবরণ",
  "email.template.content": "কন্টেন্ট",
  "email.template.html": "HTML",
  "email.template.plain.text": "সরল পাঠ্য",
  "email.template.html.placeholder": "HTML কন্টেন্ট লিখুন",
  "email.template.text": "পাঠ্য",
  "email.template.text.placeholder": "সরল পাঠ্য কন্টেন্ট লিখুন",
  "email.template.plain.text.hint":
    "HTML সমর্থন করে না এমন ইমেইল ক্লায়েন্টের জন্য সরল পাঠ্য ব্যবহৃত হয়",
  "email.template.preview": "প্রাকদর্শন",
  "email.template.live.preview": "লাইভ প্রাকদর্শন",
  "email.template.enter.html.preview": "প্রাকদর্শন দেখতে HTML কন্টেন্ট লিখুন",
  "email.template.default.content": "এখানে আপনার ইমেইল কন্টেন্ট লিখুন...",

  "email.template.new": "নতুন টেমপ্লেট",
  "email.template.test.send": "পরীক্ষা ইমেইল পাঠান",
  "email.template.empty": "কোনো ইমেইল টেমপ্লেট পাওয়া যায়নি",
  "email.template.test.dialog.title": "ইমেইল টেমপ্লেট পরীক্ষা",
  "email.template.template": "টেমপ্লেট",
  "email.template.email.config": "ইমেইল কনফিগারেশন",
  "email.template.select.config": "একটি কনফিগারেশন নির্বাচন করুন",
  "email.template.variables": "টেমপ্লেট ভেরিয়েবল",
  "email.template.enter.value.for": "{{variable}} এর জন্য মান লিখুন",
  "email.template.select.config.and.recipient":
    "অনুগ্রহ করে একটি ইমেইল কনফিগারেশন নির্বাচন করুন এবং প্রাপক লিখুন",
  "email.template.delete.title": "টেমপ্লেট মুছুন",

  "form.create.success": "ফর্ম সফলভাবে তৈরি হয়েছে",
  "form.create.many.success": "{{count}}টি ফর্ম সফলভাবে তৈরি হয়েছে",
  "form.get.success": "ফর্ম সফলভাবে পুনরুদ্ধার হয়েছে",
  "form.get.by.ids.success": "আইডি অনুসারে ফর্মগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "form.get.by.filter.success":
    "ফিল্টার অনুসারে ফর্মগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "form.get.all.success": "ফর্মগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "form.update.success": "ফর্ম সফলভাবে হালনাগাদ হয়েছে",
  "form.update.many.success": "{{count}}টি ফর্ম সফলভাবে হালনাগাদ হয়েছে",
  "form.delete.success": "ফর্ম সফলভাবে মুছে ফেলা হয়েছে",
  "form.restore.success": "ফর্ম সফলভাবে পুনরুদ্ধার হয়েছে",
  "form.not.found": "ফর্ম পাওয়া যায়নি",
  "form.not.public": "এই ফর্মটি পাবলিক অ্যাক্সেসের জন্য উপলব্ধ নয়",
  "form.auth.required": "এই ফর্ম জমা দিতে প্রমাণীকরণ প্রয়োজন",
  "form.access.denied": "এই ফর্ম অ্যাক্সেস করার অনুমতি আপনার নেই",
  "form.invalid.access.type": "অবৈধ ফর্ম অ্যাক্সেস টাইপ",
  "form.permission.check.failed":
    "অনুমতি যাচাই করা যাচ্ছে না। অনুগ্রহ করে আবার চেষ্টা করুন।",
  "form.get.access.info.success":
    "ফর্ম অ্যাক্সেস তথ্য সফলভাবে পুনরুদ্ধার হয়েছে",

  "form.result.create.success": "ফর্ম ফলাফল সফলভাবে তৈরি হয়েছে",
  "form.result.create.many.success":
    "{{count}}টি ফর্ম ফলাফল সফলভাবে তৈরি হয়েছে",
  "form.result.get.success": "ফর্ম ফলাফল সফলভাবে পুনরুদ্ধার হয়েছে",
  "form.result.get.by.ids.success":
    "আইডি অনুসারে ফর্ম ফলাফলগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "form.result.get.by.filter.success":
    "ফিল্টার অনুসারে ফর্ম ফলাফলগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "form.result.get.all.success": "ফর্ম ফলাফলগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "form.result.update.success": "ফর্ম ফলাফল সফলভাবে হালনাগাদ হয়েছে",
  "form.result.update.many.success":
    "{{count}}টি ফর্ম ফলাফল সফলভাবে হালনাগাদ হয়েছে",
  "form.result.delete.success": "ফর্ম ফলাফল সফলভাবে মুছে ফেলা হয়েছে",
  "form.result.restore.success": "ফর্ম ফলাফল সফলভাবে পুনরুদ্ধার হয়েছে",
  "form.result.not.found": "ফর্ম ফলাফল পাওয়া যায়নি",
  "form.result.has.submitted.success": "ব্যবহারকারী এই ফর্মটি জমা দিয়েছেন",
  "form.result.has.not.submitted.success": "ব্যবহারকারী এই ফর্মটি জমা দেননি",
  "form.result.submit.success": "ফর্ম সফলভাবে জমা দেওয়া হয়েছে",
  "form.result.draft.get.success": "খসড়া সফলভাবে পুনরুদ্ধার হয়েছে",
  "form.result.draft.update.success": "খসড়া সফলভাবে হালনাগাদ হয়েছে",

  "form.builder.title": "ফর্ম",
  "form.builder.create.form": "ফর্ম তৈরি করুন",
  "form.builder.table.access": "অ্যাক্সেস",
  "form.builder.table.version": "সংস্করণ",
  "form.builder.details.no.description": "কোনো বিবরণ নেই",
  "form.builder.tooltip.view.edit": "দেখুন/সম্পাদনা",
  "form.builder.tooltip.copy.link": "লিঙ্ক কপি করুন",
  "form.builder.tooltip.delete": "মুছুন",
  "form.builder.toast.copied": "কপি হয়েছে",
  "form.builder.toast.copied.detail": "ফর্ম লিঙ্ক ক্লিপবোর্ডে কপি হয়েছে",
  "form.builder.access.type.public": "পাবলিক",
  "form.builder.access.type.authenticated": "প্রমাণীকৃত",
  "form.builder.access.type.action.group": "অনুমতি-ভিত্তিক",

  "form.builder.untitled.form": "শিরোনামহীন ফর্ম",
  "form.builder.action.open.public": "পাবলিক খুলুন",
  "form.builder.tooltip.open.public": "পাবলিক ফর্ম নতুন ট্যাবে খুলুন",
  "form.builder.action.copy.link": "লিঙ্ক কপি করুন",
  "form.builder.tooltip.copy.form.link": "ফর্ম জমা দেওয়ার লিঙ্ক কপি করুন",
  "form.builder.tab.builder": "বিল্ডার",
  "form.builder.tab.settings": "সেটিংস",
  "form.builder.tab.preview": "প্রাকদর্শন",
  "form.builder.tab.results": "ফলাফল",
  "form.builder.details.form.name": "ফর্মের নাম",
  "form.builder.details.form.name.placeholder": "ফর্মের নাম লিখুন",
  "form.builder.details.form.description.placeholder": "ফর্মের বিবরণ লিখুন",
  "form.builder.details.form.slug": "ফর্ম স্লাগ",
  "form.builder.details.form.slug.placeholder": "যেমন, customer-feedback",
  "form.builder.details.used.for.public.urls":
    "পাবলিক ফর্ম URL এর জন্য ব্যবহৃত",
  "form.builder.details.access.type": "অ্যাক্সেস টাইপ",
  "form.builder.details.select.actions": "অ্যাকশন নির্বাচন করুন",
  "form.builder.details.no.actions.available":
    "কোনো অ্যাকশন উপলব্ধ নেই। প্রথমে IAM মডিউলে অ্যাকশন কনফিগার করুন।",
  "form.builder.details.no.actions.empty": "কোনো অ্যাকশন উপলব্ধ নেই",
  "form.builder.details.users.with.access":
    "এই অ্যাকশনগুলো সহ ব্যবহারকারীদের অ্যাক্সেস থাকবে",
  "form.builder.details.selected.permissions": "নির্বাচিত অনুমতি",
  "form.builder.details.action.codes.required":
    "এই অ্যাকশন কোডগুলো ফর্ম অ্যাক্সেসের জন্য প্রয়োজন হবে",
  "form.builder.details.required.permissions": "প্রয়োজনীয় অনুমতি",
  "form.builder.details.permissions.placeholder":
    "অনুমতি কোড টাইপ করুন এবং Enter চাপুন",
  "form.builder.details.users.must.have.permission":
    "ব্যবহারকারীদের জমা দিতে এই অনুমতিগুলোর একটি থাকতে হবে",
  "form.builder.details.response.type": "প্রতিক্রিয়া টাইপ",
  "form.builder.details.response.mode.single.hint":
    "প্রতিটি ব্যবহারকারী শুধু একবার জমা দিতে পারেন। প্রমাণীকৃত ব্যবহারকারীদের জন্য, বিদ্যমান জমা চেক করে এটি প্রয়োগ করা হয়। পাবলিক ফর্মগুলোর জন্য, এটি ব্রাউজার স্টোরেজ ব্যবহার করে।",
  "form.builder.details.response.mode.multiple.hint":
    "ব্যবহারকারীরা অসীম সংখ্যক প্রতিক্রিয়া জমা দিতে পারেন।",
  "form.builder.details.form.is.active": "ফর্ম সক্রিয়",
  "form.builder.details.add.fields.to.preview":
    "প্রাকদর্শন দেখতে বিল্ডার ট্যাবে ফিল্ড যোগ করুন",
  "form.builder.table.submitted.at": "জমা দেওয়া হয়েছে",
  "form.builder.table.schema.version": "স্কিমা সংস্করণ",
  "form.builder.table.source": "উৎস",
  "form.builder.table.source.authenticated": "প্রমাণীকৃত",
  "form.builder.table.source.anonymous": "বেনামী",
  "form.builder.tooltip.view.response": "প্রতিক্রিয়া দেখুন",
  "form.builder.details.no.submissions.yet": "এখনো কোনো জমা নেই",
  "form.builder.details.access.public": "পাবলিক (কোনো প্রমাণীকরণ প্রয়োজন নেই)",
  "form.builder.details.access.authenticated": "প্রমাণীকৃত (লগইন প্রয়োজন)",
  "form.builder.details.access.permission": "অনুমতি-ভিত্তিক",
  "form.builder.details.multiple.responses": "একাধিক প্রতিক্রিয়া",
  "form.builder.details.single.response": "একক প্রতিক্রিয়া",
  "form.builder.toast.validation": "যাচাইকরণ ত্রুটি",
  "form.builder.toast.form.name.required": "ফর্মের নাম প্রয়োজন",
  "form.builder.toast.created": "তৈরি হয়েছে",
  "form.builder.toast.saved": "সংরক্ষিত",

  "form.builder.public.loading": "ফর্ম লোড হচ্ছে...",
  "form.builder.public.something.went.wrong": "কিছু ভুল হয়েছে",
  "form.builder.action.go.back": "ফিরে যান",
  "form.builder.public.access.restricted": "অ্যাক্সেস সীমাবদ্ধ",
  "form.builder.public.access.restricted.description":
    "এই ফর্মটি দেখার বা জমা দেওয়ার জন্য আপনার প্রয়োজনীয় অনুমতি নেই। আপনি যদি মনে করেন এটি একটি ত্রুটি তাহলে অনুগ্রহ করে আপনার প্রশাসকের সাথে যোগাযোগ করুন।",
  "form.builder.public.login.required": "এই ফর্মের জন্য আপনাকে লগইন করতে হবে।",
  "form.builder.public.permission.required":
    "এই ফর্মের জন্য নির্দিষ্ট অনুমতি প্রয়োজন। চালিয়ে যেতে অনুগ্রহ করে লগইন করুন।",
  "form.builder.action.login.to.continue": "চালিয়ে যেতে লগইন করুন",
  "form.builder.public.continue.your.draft": "আপনার খসড়া চালিয়ে যাবেন?",
  "form.builder.public.draft.saved.description":
    "এই ফর্মের জন্য আপনার একটি সংরক্ষিত খসড়া আছে। আপনি কি যেখানে ছেড়েছিলেন সেখান থেকে চালিয়ে যেতে চান?",
  "form.builder.public.schema.change.warning":
    "দ্রষ্টব্য: আপনি খসড়া সংরক্ষণের পর থেকে ফর্মটি হালনাগাদ হয়েছে। কিছু ফিল্ড পরিবর্তিত হতে পারে।",
  "form.builder.action.continue.draft": "খসড়া চালিয়ে যান",
  "form.builder.action.start.fresh": "নতুনভাবে শুরু করুন",
  "form.builder.public.thank.you": "ধন্যবাদ!",
  "form.builder.public.response.recorded.success":
    "আপনার প্রতিক্রিয়া সফলভাবে রেকর্ড করা হয়েছে।",
  "form.builder.action.submit.another": "আরেকটি প্রতিক্রিয়া জমা দিন",
  "form.builder.public.already.submitted": "ইতিমধ্যে জমা দেওয়া হয়েছে",
  "form.builder.public.already.submitted.description":
    "আপনি ইতিমধ্যে এই ফর্মে একটি প্রতিক্রিয়া জমা দিয়েছেন।",
  "form.builder.public.single.submission.note":
    "এই ফর্মটি প্রতি ব্যবহারকারীকে শুধু একটি জমা অনুমতি দেয়।",
  "form.builder.error.form.id.required": "ফর্ম আইডি প্রয়োজন",
  "form.builder.error.form.not.available":
    "এই ফর্মটি বিদ্যমান নেই বা উপলব্ধ নয়।",
  "form.builder.error.form.inactive": "এই ফর্মটি বর্তমানে নিষ্ক্রিয়।",
  "form.builder.error.invalid.configuration": "অবৈধ ফর্ম কনফিগারেশন।",
  "form.builder.error.not.public":
    "এই ফর্মটি পাবলিক অ্যাক্সেসের জন্য উপলব্ধ নয়।",
  "form.builder.error.load.failed": "ফর্ম লোড করতে ব্যর্থ।",
  "form.builder.toast.submitted": "জমা দেওয়া হয়েছে",
  "form.builder.toast.draft.saved": "খসড়া সংরক্ষিত",
  "form.builder.toast.draft.saved.detail":
    "আপনার অগ্রগতি স্থানীয়ভাবে সংরক্ষিত হয়েছে",
  "form.builder.toast.draft.not.saved": "খসড়া সংরক্ষিত হয়নি",
  "form.builder.toast.draft.not.saved.detail":
    "খসড়া সংরক্ষণ করা যাচ্ছে না। আপনার ব্রাউজার প্রাইভেট মোডে থাকতে পারে বা স্টোরেজ পূর্ণ।",
  "form.builder.public.powered.by": "{{appName}} ফর্ম বিল্ডার দ্বারা চালিত",

  "form.builder.result.form.submission": "ফর্ম জমা",
  "form.builder.action.download.pdf": "PDF ডাউনলোড",
  "form.builder.action.download.json": "JSON ডাউনলোড",
  "form.builder.result.error.loading.submission": "জমা লোড করতে ত্রুটি",
  "form.builder.error.load.submission.failed": "জমা লোড করতে ব্যর্থ",
  "form.builder.error.result.id.required": "ফলাফল আইডি প্রয়োজন",
  "form.builder.toast.downloaded": "ডাউনলোড হয়েছে",
  "form.builder.toast.downloaded.pdf.detail": "PDF ডাউনলোড হয়েছে",
  "form.builder.toast.downloaded.json.detail": "JSON ডাউনলোড হয়েছে",
  "form.builder.result.version.notice":
    "এই জমাটি ফর্ম সংস্করণ v{{submissionVersion}} দিয়ে করা হয়েছিল। বর্তমান ফর্ম সংস্করণ v{{currentVersion}}।",

  "form.builder.tooltip.unsaved.changes": "অসংরক্ষিত পরিবর্তন",
  "form.builder.tooltip.toggle.layout":
    "বিভাগ-ভিত্তিক এবং ফ্ল্যাট ফর্ম লেআউটের মধ্যে টগল করুন",
  "form.builder.toolbar.flat": "ফ্ল্যাট",
  "form.builder.toolbar.sections": "বিভাগ",
  "form.builder.toolbar.section": "বিভাগ",
  "form.builder.toolbar.field": "ফিল্ড",
  "form.builder.toolbar.fields": "ফিল্ড",
  "form.builder.action.import": "ইমপোর্ট",
  "form.builder.tooltip.import.schema": "ফর্ম স্কিমা ইমপোর্ট করুন",
  "form.builder.action.export": "এক্সপোর্ট",
  "form.builder.tooltip.export.schema": "ফর্ম স্কিমা এক্সপোর্ট করুন",

  "form.builder.field.types": "ফিল্ড টাইপ",
  "form.builder.search.fields.placeholder": "ফিল্ড অনুসন্ধান করুন...",
  "form.builder.input.fields": "ইনপুট ফিল্ড",
  "form.builder.selection.fields": "নির্বাচন ফিল্ড",
  "form.builder.specialized.fields": "বিশেষায়িত ফিল্ড",
  "form.builder.no.fields.match": '"{{query}}" এর সাথে কোনো ফিল্ড মিলছে না',
  "form.builder.field.text": "টেক্সট ফিল্ড",
  "form.builder.field.textarea": "টেক্সট এরিয়া",
  "form.builder.field.number": "নম্বর ফিল্ড",
  "form.builder.field.email": "ইমেইল ফিল্ড",
  "form.builder.field.phone": "ফোন",
  "form.builder.field.checkbox": "চেকবক্স",
  "form.builder.field.radio": "রেডিও গ্রুপ",
  "form.builder.field.date": "তারিখ পিকার",
  "form.builder.field.time": "সময়",
  "form.builder.field.datetime": "তারিখ ও সময়",
  "form.builder.field.dropdown": "ড্রপডাউন",
  "form.builder.field.multi.select": "মাল্টি-সিলেক্ট",
  "form.builder.field.file": "ফাইল আপলোড",
  "form.builder.field.file.upload": "ফাইল আপলোড",
  "form.builder.field.image": "ছবি আপলোড",
  "form.builder.field.signature": "স্বাক্ষর",
  "form.builder.field.rating": "রেটিং",
  "form.builder.field.slider": "স্লাইডার",
  "form.builder.field.likert": "লিকার্ট স্কেল",
  "form.builder.field.unknown": "অজানা ফিল্ড টাইপ",

  "form.builder.section.settings": "বিভাগ সেটিংস",
  "form.builder.tab.general": "সাধারণ",
  "form.builder.tab.validation": "যাচাইকরণ",
  "form.builder.tab.options": "বিকল্প",
  "form.builder.tab.logic": "যুক্তি",
  "form.builder.field.label": "লেবেল",
  "form.builder.field.label.placeholder": "ফিল্ড লেবেল লিখুন",
  "form.builder.field.field.name": "ফিল্ডের নাম",
  "form.builder.field.name.placeholder": "যেমন, first_name",
  "form.builder.field.name.hint":
    "জমা ডেটাতে কী হিসেবে ব্যবহৃত। ফর্মের মধ্যে অনন্য হতে হবে।",
  "form.builder.field.placeholder": "প্লেসহোল্ডার",
  "form.builder.placeholder.text": "প্লেসহোল্ডার টেক্সট লিখুন",
  "form.builder.field.help.text": "সহায়তা টেক্সট",
  "form.builder.help.text.placeholder": "সহায়তা টেক্সট লিখুন",
  "form.builder.label.width": "প্রস্থ",
  "form.builder.field.required": "প্রয়োজনীয়",
  "form.builder.field.visible": "দৃশ্যমান",
  "form.builder.rating.settings": "রেটিং সেটিংস",
  "form.builder.rating.number.of.stars": "তারকার সংখ্যা",
  "form.builder.rating.min.label": "সর্বনিম্ন লেবেল",
  "form.builder.rating.min.example": "যেমন, কম সম্ভাব্য",
  "form.builder.rating.max.label": "সর্বোচ্চ লেবেল",
  "form.builder.rating.max.example": "যেমন, অত্যন্ত সম্ভাব্য",
  "form.builder.section.name": "বিভাগের নাম",
  "form.builder.section.name.placeholder": "বিভাগের নাম লিখুন",
  "form.builder.section.description": "বিবরণ",
  "form.builder.section.desc.placeholder": "বিভাগের বিবরণ লিখুন",
  "form.builder.section.collapsible": "সঙ্কুচিতযোগ্য",
  "form.builder.section.initially.collapsed": "প্রাথমিকভাবে সঙ্কুচিত",
  "form.builder.section.layout": "লেআউট",
  "form.builder.layout.grid.columns": "গ্রিড কলাম",
  "form.builder.layout.grid.columns.hint":
    "এই বিভাগের গ্রিড লেআউটে কলামের সংখ্যা।",
  "form.builder.layout.field.gap": "ফিল্ড গ্যাপ",
  "form.builder.layout.field.gap.hint": "গ্রিডে ফিল্ডগুলোর মধ্যে ব্যবধান।",
  "form.builder.validation.min.length.label": "সর্বনিম্ন দৈর্ঘ্য",
  "form.builder.validation.max.length.label": "সর্বোচ্চ দৈর্ঘ্য",
  "form.builder.email.pattern": "ইমেইল প্যাটার্ন",
  "form.builder.email.pattern.placeholder": "যেমন, @gmail\\.com$",
  "form.builder.email.pattern.hint":
    "অনুমোদিত ইমেইল ডোমেইন সীমাবদ্ধ করতে রেগুলার এক্সপ্রেশন।",
  "form.builder.email.example.gmail": "শুধু Gmail ঠিকানা",
  "form.builder.email.example.domains": "একাধিক ডোমেইন",
  "form.builder.email.pattern.message": "প্যাটার্ন ত্রুটি বার্তা",
  "form.builder.email.pattern.message.placeholder":
    "যেমন, শুধু কোম্পানি ইমেইল গ্রহণযোগ্য",
  "form.builder.email.pattern.message.hint":
    "ইমেইল প্যাটার্নের সাথে মেলে না হলে দেখানো হয়।",
  "form.builder.validation.min.value": "সর্বনিম্ন মান",
  "form.builder.validation.max.value": "সর্বোচ্চ মান",
  "form.builder.validation.step": "ধাপ",
  "form.builder.validation.max.selections": "সর্বোচ্চ নির্বাচন",
  "form.builder.validation.unlimited.hint": "অসীম নির্বাচনের জন্য ফাঁকা রাখুন।",
  "form.builder.validation.max.files": "সর্বোচ্চ ফাইল",
  "form.builder.validation.max.file.size": "সর্বোচ্চ ফাইল আকার (বাইট)",
  "form.builder.validation.no.options":
    "কোনো বিকল্প যোগ করা হয়নি। কমপক্ষে একটি বিকল্প যোগ করুন।",
  "form.builder.likert.scale.labels": "স্কেল লেবেল",
  "form.builder.likert.option.number": "বিকল্প {{index}}",
  "form.builder.tooltip.remove.column": "কলাম সরান",
  "form.builder.likert.add.column": "কলাম যোগ করুন",
  "form.builder.likert.statements": "বিবৃতি (সারি)",
  "form.builder.likert.statement.number": "বিবৃতি {{index}}",
  "form.builder.likert.add.statement": "বিবৃতি যোগ করুন",
  "form.builder.tooltip.remove.statement": "বিবৃতি সরান",
  "form.builder.option.label.placeholder": "বিকল্প লেবেল লিখুন",
  "form.builder.tooltip.remove.option": "বিকল্প সরান",
  "form.builder.options.add.option": "বিকল্প যোগ করুন",
  "form.builder.section.visibility": "বিভাগ দৃশ্যমানতা",
  "form.builder.section.visibility.hint":
    "ফিল্ড মানের উপর ভিত্তি করে এই বিভাগ কখন দেখানো হবে তা নিয়ন্ত্রণ করুন।",
  "form.builder.logic.conditional.rules": "শর্তাধীন নিয়ম",
  "form.builder.logic.conditional.rules.hint":
    "অন্যান্য ফিল্ড মানের উপর ভিত্তি করে দৃশ্যমানতা বা প্রয়োজনীয়তা নিয়ন্ত্রণ করতে নিয়ম যোগ করুন।",
  "form.builder.logic.rule.number": "নিয়ম",
  "form.builder.tooltip.remove.rule": "নিয়ম সরান",
  "form.builder.logic.no.rules": "কোনো শর্তাধীন নিয়ম সংজ্ঞায়িত নেই।",
  "form.builder.logic.add.rule": "নিয়ম যোগ করুন",
  "form.builder.width.auto": "অটো",
  "form.builder.width.full": "সম্পূর্ণ প্রস্থ",
  "form.builder.width.half": "অর্ধেক প্রস্থ",
  "form.builder.width.third": "এক-তৃতীয়াংশ",
  "form.builder.width.quarter": "এক-চতুর্থাংশ",
  "form.builder.layout.column1": "১ কলাম",
  "form.builder.layout.column2": "২ কলাম",
  "form.builder.layout.column3": "৩ কলাম",
  "form.builder.layout.column4": "৪ কলাম",
  "form.builder.layout.gap.small": "ছোট (০.৫rem)",
  "form.builder.layout.gap.medium": "মাঝারি (১rem)",
  "form.builder.layout.gap.large": "বড় (১.৫rem)",
  "form.builder.layout.gap.x.large": "অতিরিক্ত বড় (২rem)",

  "form.builder.logic.add.conditional.logic":
    "এই ফিল্ডটি কখন প্রদর্শিত বা প্রয়োজনীয় হবে তা নিয়ন্ত্রণ করতে শর্তাধীন যুক্তি যোগ করুন।",
  "form.builder.action.add.logic": "যুক্তি যোগ করুন",
  "form.builder.logic.action.label": "অ্যাকশন",
  "form.builder.logic.select.action.placeholder": "অ্যাকশন নির্বাচন করুন",
  "form.builder.logic.select.target": "লক্ষ্য নির্বাচন করুন",
  "form.builder.logic.when": "যখন:",
  "form.builder.logic.of.following.conditions": "নিম্নলিখিত শর্তের মধ্যে সত্য",
  "form.builder.logic.select.field": "ফিল্ড নির্বাচন করুন",
  "form.builder.logic.select.comparison": "তুলনা নির্বাচন করুন",
  "form.builder.logic.value.placeholder": "মান",
  "form.builder.logic.select.date": "তারিখ নির্বাচন করুন",
  "form.builder.logic.select.value": "মান নির্বাচন করুন",
  "form.builder.logic.select.values": "মানগুলো নির্বাচন করুন",
  "form.builder.logic.remove.condition.tooltip": "শর্ত সরান",
  "form.builder.action.add.condition": "শর্ত যোগ করুন",
  "form.builder.action.remove.logic": "যুক্তি সরান",
  "form.builder.logic.any": "যেকোনো",
  "form.builder.logic.hide.section": "বিভাগ লুকান",
  "form.builder.logic.hide.field": "ফিল্ড লুকান",
  "form.builder.logic.make.required": "প্রয়োজনীয় করুন",
  "form.builder.logic.jump.to.section": "বিভাগে যান",
  "form.builder.logic.target": "লক্ষ্য",

  "form.builder.computed.computed.fields": "গণনাকৃত ফিল্ড",
  "form.builder.computed.define.fields":
    "জমা দেওয়ার সময় ফর্ম প্রতিক্রিয়া থেকে গণনা করা ফিল্ড সংজ্ঞায়িত করুন",
  "form.builder.action.add.computed.field": "গণনাকৃত ফিল্ড যোগ করুন",
  "form.builder.computed.no.computed.fields":
    "কোনো গণনাকৃত ফিল্ড সংজ্ঞায়িত নেই",
  "form.builder.computed.click.to.create":
    'একটি তৈরি করতে "গণনাকৃত ফিল্ড যোগ করুন" ক্লিক করুন',
  "form.builder.computed.unnamed.field": "নামহীন ফিল্ড",
  "form.builder.computed.name": "নাম",
  "form.builder.computed.name.placeholder": "যেমন, মোট স্কোর",
  "form.builder.computed.key": "কী",
  "form.builder.computed.key.placeholder": "যেমন, total_score",
  "form.builder.computed.used.in.submission.data": "জমা ডেটাতে ব্যবহৃত",
  "form.builder.computed.value.type": "মান টাইপ",
  "form.builder.computed.default.value.label":
    "ডিফল্ট মান (কোনো নিয়ম না মিললে)",
  "form.builder.computed.default.number": "ডিফল্ট নম্বর লিখুন",
  "form.builder.computed.default.value": "ডিফল্ট মান লিখুন",
  "form.builder.computed.computation.rules": "গণনা নিয়ম",
  "form.builder.action.add.rule": "নিয়ম যোগ করুন",
  "form.builder.computed.rules.evaluation.order":
    "নিয়মগুলো ক্রম অনুসারে মূল্যায়ন করা হয়। প্রথম মিলে যাওয়া নিয়ম প্রয়োগ হয়।",
  "form.builder.computed.no.rules.defined":
    "কোনো নিয়ম সংজ্ঞায়িত নেই। গণনা কনফিগার করতে একটি নিয়ম যোগ করুন।",
  "form.builder.computed.rule.number": "নিয়ম {{number}}",
  "form.builder.tooltip.move.up": "উপরে সরান",
  "form.builder.tooltip.move.down": "নিচে সরান",
  "form.builder.tooltip.delete.rule": "নিয়ম মুছুন",
  "form.builder.computed.condition.optional": "শর্ত (ঐচ্ছিক)",
  "form.builder.action.remove.condition": "শর্ত সরান",
  "form.builder.computed.of.the.following": "নিম্নলিখিতগুলোর:",
  "form.builder.logic.enter.value": "মান লিখুন",
  "form.builder.computed.no.condition.always":
    "কোনো শর্ত নেই = সর্বদা প্রযোজ্য (যদি পৌঁছানো হয়)",
  "form.builder.computed.then.set.value.to": "তারপর মান সেট করুন:",
  "form.builder.logic.select.operation": "অপারেশন নির্বাচন করুন",
  "form.builder.computed.add.operand": "অপারেন্ড যোগ করুন",
  "form.builder.computed.delete.computed.field": "গণনাকৃত ফিল্ড মুছুন",
  "form.builder.computed.value.type.number": "নম্বর",
  "form.builder.computed.value.type.text": "টেক্সট",
  "form.builder.computed.computation.type.direct": "সরাসরি মান",
  "form.builder.computed.computation.type.field.reference": "ফিল্ড রেফারেন্স",
  "form.builder.computed.computation.type.arithmetic": "পাটিগণিত",
  "form.builder.computed.arithmetic.sum": "যোগফল",
  "form.builder.computed.arithmetic.subtract": "বিয়োগ",
  "form.builder.computed.arithmetic.multiply": "গুণ",
  "form.builder.computed.arithmetic.divide": "ভাগ",
  "form.builder.computed.arithmetic.average": "গড়",
  "form.builder.computed.arithmetic.min": "সর্বনিম্ন",
  "form.builder.computed.arithmetic.max": "সর্বোচ্চ",
  "form.builder.computed.arithmetic.increment": "বৃদ্ধি",
  "form.builder.computed.arithmetic.decrement": "হ্রাস",
  "form.builder.computed.operand.type.field": "ফিল্ড",
  "form.builder.computed.operand.type.value": "মান",

  "form.builder.operator.is.empty": "খালি",
  "form.builder.operator.is.not.empty": "খালি নয়",
  "form.builder.operator.is": "হলো",
  "form.builder.operator.is.not": "নয়",
  "form.builder.operator.contains": "ধারণ করে",
  "form.builder.operator.not.contains": "ধারণ করে না",
  "form.builder.operator.starts.with": "দিয়ে শুরু হয়",
  "form.builder.operator.ends.with": "দিয়ে শেষ হয়",
  "form.builder.operator.equals": "সমান",
  "form.builder.operator.not.equals": "সমান নয়",
  "form.builder.operator.greater.than": "বড়",
  "form.builder.operator.less.than": "ছোট",
  "form.builder.operator.greater.or.equal": "বড় বা সমান",
  "form.builder.operator.less.or.equal": "ছোট বা সমান",
  "form.builder.operator.is.before": "পূর্বে",
  "form.builder.operator.is.after": "পরে",
  "form.builder.operator.is.checked": "চেক করা",
  "form.builder.operator.is.not.checked": "চেক করা নেই",
  "form.builder.operator.is.any.of": "যেকোনো একটি",
  "form.builder.operator.is.none.of": "কোনোটিই নয়",
  "form.builder.operator.contains.any.of": "যেকোনো একটি ধারণ করে",
  "form.builder.operator.contains.none.of": "কোনোটিই ধারণ করে না",
  "form.builder.operator.row.value.equals": "সারির মান সমান",
  "form.builder.operator.row.value.not.equals": "সারির মান সমান নয়",
  "form.builder.operator.has.files": "ফাইল আছে",
  "form.builder.operator.has.no.files": "কোনো ফাইল নেই",
  "form.builder.logic.action.hide.when": "যখন লুকান...",
  "form.builder.logic.action.require.when": "যখন প্রয়োজনীয়...",
  "form.builder.logic.action.hide.field.when": "যখন ফিল্ড লুকান...",
  "form.builder.logic.action.make.field.required.when":
    "যখন ফিল্ড প্রয়োজনীয় করুন...",
  "form.builder.logic.action.jump.to.section.when": "যখন বিভাগে যান...",
  "form.builder.logic.action.hide.section.when": "যখন বিভাগ লুকান...",
  "form.builder.logic.action.hide.this.section.when": "যখন এই বিভাগ লুকান...",

  "form.builder.section.no.sections": "এখনো কোনো বিভাগ নেই",
  "form.builder.section.start.by.adding": "একটি বিভাগ যোগ করে শুরু করুন",
  "form.builder.section.add": "বিভাগ যোগ করুন",
  "form.builder.new.section": "নতুন বিভাগ",

  "form.builder.tooltip.conditional.visibility":
    "শর্তাধীন দৃশ্যমানতা নিয়ম সক্রিয়",
  "form.builder.tooltip.duplicate.section": "বিভাগ ডুপ্লিকেট",
  "form.builder.tooltip.delete.section": "বিভাগ মুছুন",
  "form.builder.section.drag.fields.here": "এখানে ফিল্ড টানুন",

  "form.builder.layout.responsive": "রেসপন্সিভ লেআউট",
  "form.builder.layout.enable.responsive": "রেসপন্সিভ লেআউট সক্রিয় করুন",
  "form.builder.layout.responsive.hint":
    "স্ক্রিনের আকারের উপর ভিত্তি করে স্বয়ংক্রিয়ভাবে কলাম সামঞ্জস্য করুন।",
  "form.builder.layout.mobile": "মোবাইল",
  "form.builder.layout.tablet": "ট্যাবলেট",
  "form.builder.layout.desktop": "ডেস্কটপ",
  "form.builder.layout.large": "বড়",
  "form.builder.layout.xl": "অতিরিক্ত বড়",

  "form.builder.layout.form.layout": "ফর্ম লেআউট",
  "form.builder.layout.click.form.fields":
    'লেআউট সেটিংস সম্পাদনা করতে "ফর্ম ফিল্ড" ক্লিক করুন',
  "form.builder.layout.select.field.to.edit":
    "অথবা একটি ফিল্ড নির্বাচন করুন এর বৈশিষ্ট্য সম্পাদনা করতে",
  "form.builder.layout.select.to.edit":
    "এর বৈশিষ্ট্য সম্পাদনা করতে একটি ফিল্ড বা বিভাগ নির্বাচন করুন",
  "form.builder.toast.import.failed": "ইমপোর্ট ব্যর্থ",
  "form.builder.toast.import.failed.detail": "অবৈধ JSON ফাইল ফরম্যাট",

  "form.builder.section.default": "বিভাগ",
  "form.builder.likert.strongly.disagree": "দৃঢ়ভাবে অসম্মত",
  "form.builder.likert.disagree": "অসম্মত",
  "form.builder.likert.neutral": "নিরপেক্ষ",
  "form.builder.likert.agree": "সম্মত",
  "form.builder.likert.strongly.agree": "দৃঢ়ভাবে সম্মত",
  "form.builder.defaults.option1": "বিকল্প ১",
  "form.builder.defaults.option2": "বিকল্প ২",
  "form.builder.defaults.statement1": "বিবৃতি ১",
  "form.builder.defaults.statement2": "বিবৃতি ২",

  "form.builder.result.submitted": "জমা দেওয়া হয়েছে",
  "form.builder.result.version": "সংস্করণ",
  "form.builder.result.fields.answered":
    "{{answered}} / {{total}} ফিল্ড উত্তর দেওয়া হয়েছে",
  "form.builder.result.computed.title": "গণনাকৃত ফলাফল",
  "form.builder.result.computed.subtitle":
    "আপনার প্রতিক্রিয়ার উপর ভিত্তি করে স্বয়ংক্রিয়-গণনাকৃত",
  "form.builder.status.draft": "খসড়া",
  "form.builder.status.completed": "সম্পন্ন",

  "form.builder.result.no.selection": "কোনো নির্বাচন নেই",
  "form.builder.result.no.responses": "কোনো প্রতিক্রিয়া নেই",
  "form.builder.result.no.rating": "কোনো রেটিং নেই",
  "form.builder.result.no.file.uploaded": "কোনো ফাইল আপলোড হয়নি",
  "form.builder.result.no.answer": "কোনো উত্তর নেই",

  "form.builder.validation.required": "{{label}} প্রয়োজন",
  "form.builder.validation.email": "অনুগ্রহ করে একটি বৈধ ইমেইল ঠিকানা লিখুন",
  "form.builder.validation.must.match.format":
    "{{label}} প্রয়োজনীয় ফরম্যাটের সাথে মিলতে হবে",
  "form.builder.validation.min.length":
    "{{label}} কমপক্ষে {{value}} অক্ষরের হতে হবে",
  "form.builder.validation.max.length":
    "{{label}} সর্বোচ্চ {{value}} অক্ষরের হতে হবে",
  "form.builder.validation.min": "{{label}} কমপক্ষে {{value}} হতে হবে",
  "form.builder.validation.max": "{{label}} সর্বোচ্চ {{value}} হতে হবে",
  "form.builder.validation.pattern": "{{label}} ফরম্যাট অবৈধ",
  "form.builder.validation.invalid": "{{label}} অবৈধ",

  "form.builder.schema.invalid": "অবৈধ স্কিমা",
  "form.builder.schema.invalid.json": "অবৈধ JSON ফরম্যাট",
  "form.builder.schema.browser.only":
    "এই বৈশিষ্ট্যটি শুধুমাত্র ব্রাউজারে উপলব্ধ",
  "form.builder.schema.read.failed": "ফাইল পড়তে ব্যর্থ",
  "form.builder.validation.schema.must.be.object":
    "স্কিমা একটি অবজেক্ট হতে হবে",
  "form.builder.validation.schema.id.required":
    "স্কিমাতে একটি স্ট্রিং আইডি থাকতে হবে",
  "form.builder.validation.schema.name.required":
    "স্কিমাতে একটি স্ট্রিং নাম থাকতে হবে",
  "form.builder.validation.schema.sections.required":
    "স্কিমাতে একটি বিভাগ অ্যারে থাকতে হবে",
  "form.builder.validation.section.must.be.object":
    "বিভাগ একটি অবজেক্ট হতে হবে",
  "form.builder.validation.section.id.required":
    "বিভাগে একটি স্ট্রিং আইডি থাকতে হবে",
  "form.builder.validation.section.name.required":
    "বিভাগে একটি স্ট্রিং নাম থাকতে হবে",
  "form.builder.validation.section.fields.required":
    "বিভাগে একটি ফিল্ড অ্যারে থাকতে হবে",
  "form.builder.validation.section.invalid.layout": "অবৈধ লেআউট টাইপ",
  "form.builder.validation.field.must.be.object": "ফিল্ড একটি অবজেক্ট হতে হবে",
  "form.builder.validation.field.id.required":
    "ফিল্ডে একটি স্ট্রিং আইডি থাকতে হবে",
  "form.builder.validation.field.invalid.type": "অবৈধ ফিল্ড টাইপ",
  "form.builder.validation.field.label.required":
    "ফিল্ডে একটি স্ট্রিং লেবেল থাকতে হবে",
  "form.builder.validation.field.options.required":
    "নির্বাচন ফিল্ডে একটি বিকল্প অ্যারে থাকতে হবে",

  "form.builder.pdf.browser.only": "PDF এক্সপোর্ট শুধুমাত্র ব্রাউজারে উপলব্ধ",
  "form.builder.pdf.stats.sections": "বিভাগ",
  "form.builder.pdf.stats.total.fields": "মোট ফিল্ড",
  "form.builder.pdf.stats.answered": "উত্তর দেওয়া হয়েছে",
  "form.builder.pdf.stats.complete": "সম্পন্ন",
  "form.builder.pdf.footer": "ফর্ম বিল্ডার দ্বারা উৎপন্ন",
  "form.builder.pdf.table.question": "প্রশ্ন",
  "form.builder.pdf.table.response": "প্রতিক্রিয়া",
  "form.builder.pdf.no.fields.in.section": "এই বিভাগে কোনো ফিল্ড নেই",
  "form.builder.pdf.table.computed.field": "গণনাকৃত ফিল্ড",
  "form.builder.pdf.table.result": "ফলাফল",

  "form.builder.action.submit": "জমা দিন",
  "form.builder.action.save.draft": "খসড়া সংরক্ষণ করুন",
  "form.builder.action.next": "পরবর্তী",

  "form.builder.field.form.fields": "ফর্ম ফিল্ড",
  "form.builder.field.drag.from.palette": "প্যালেট থেকে ফিল্ড টানুন",
  "form.builder.field.no.fields": "কোনো ফিল্ড নেই",
  "form.builder.field.drag.from.left.panel": "বাম প্যানেল থেকে ফিল্ড টানুন",

  "form.builder.tooltip.duplicate": "ডুপ্লিকেট",

  "event.create.success": "ইভেন্ট সফলভাবে তৈরি হয়েছে",
  "event.create.many.success": "{{count}}টি ইভেন্ট সফলভাবে তৈরি হয়েছে",
  "event.get.success": "ইভেন্ট সফলভাবে পুনরুদ্ধার হয়েছে",
  "event.get.by.ids.success":
    "আইডি অনুসারে ইভেন্টগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "event.get.by.filter.success":
    "ফিল্টার অনুসারে ইভেন্টগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "event.get.all.success": "ইভেন্টগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "event.update.success": "ইভেন্ট সফলভাবে হালনাগাদ হয়েছে",
  "event.update.many.success": "{{count}}টি ইভেন্ট সফলভাবে হালনাগাদ হয়েছে",
  "event.delete.success": "ইভেন্ট সফলভাবে মুছে ফেলা হয়েছে",
  "event.restore.success": "ইভেন্ট সফলভাবে পুনরুদ্ধার হয়েছে",
  "event.not.found": "ইভেন্ট পাওয়া যায়নি",

  "event.participant.not.found": "অংশগ্রহণকারী পাওয়া যায়নি",
  "event.participant.status.update.success":
    "অংশগ্রহণকারীর স্থিতি সফলভাবে হালনাগাদ হয়েছে",

  "event.manager.my.events": "আমার ইভেন্ট",
  "event.manager.all.events": "সমস্ত ইভেন্ট",
  "event.manager.recurrence.none": "কোনোটি নয়",
  "event.manager.recurrence.daily": "দৈনিক",
  "event.manager.recurrence.weekly": "সাপ্তাহিক",
  "event.manager.recurrence.biweekly": "দ্বি-সাপ্তাহিক",
  "event.manager.recurrence.monthly": "মাসিক",

  "event.manager.title": "ইভেন্ট ম্যানেজার",
  "event.manager.subtitle": "ইভেন্ট, মিটিং এবং সময়সূচি ব্যবস্থাপনা করুন",
  "event.manager.tabs.calendar": "ক্যালেন্ডার",
  "event.manager.tabs.event.list": "ইভেন্ট তালিকা",

  "event.manager.calendar.title": "ক্যালেন্ডার",
  "event.manager.event.saved.success":
    'ইভেন্ট "{{title}}" সফলভাবে সংরক্ষিত হয়েছে।',

  "event.manager.event.list.title": "ইভেন্ট তালিকা",
  "event.manager.new.event": "নতুন ইভেন্ট",
  "event.manager.table.title": "শিরোনাম",
  "event.manager.table.start": "শুরু",
  "event.manager.table.end": "শেষ",
  "event.manager.recurrence": "পুনরাবৃত্তি",
  "event.manager.table.participants": "অংশগ্রহণকারী",
  "event.manager.participants": "অংশগ্রহণকারী",
  "event.manager.no.events.in.company":
    "বর্তমান কোম্পানিতে কোনো ইভেন্ট পাওয়া যায়নি",
  "event.manager.no.events": "কোনো ইভেন্ট পাওয়া যায়নি",

  "event.manager.form.title.required": "শিরোনাম *",
  "event.manager.placeholder.title": "ইভেন্টের শিরোনাম লিখুন",
  "event.manager.form.description": "বিবরণ",
  "event.manager.placeholder.description": "বিবরণ লিখুন (ঐচ্ছিক)",
  "event.manager.form.date.required": "তারিখ প্রয়োজন",
  "event.manager.placeholder.event.date": "ইভেন্টের তারিখ নির্বাচন করুন",
  "event.manager.form.all.day.event": "সারাদিনের ইভেন্ট",
  "event.manager.form.start.time.required": "শুরুর সময় প্রয়োজন",
  "event.manager.form.end.time.required": "শেষের সময় প্রয়োজন",
  "event.manager.placeholder.recurrence": "পুনরাবৃত্তি নির্বাচন করুন",
  "event.manager.form.repeat.on": "পুনরাবৃত্তি",
  "event.manager.form.recurrence.end": "পুনরাবৃত্তি শেষ (ঐচ্ছিক)",
  "event.manager.placeholder.recurrence.end": "শেষ তারিখ না থাকলে ফাঁকা রাখুন",
  "event.manager.form.recurrence.end.hint":
    "চিরকাল পুনরাবৃত্তি করতে ফাঁকা রাখুন",
  "event.manager.form.meeting.link": "মিটিং লিঙ্ক",
  "event.manager.placeholder.meeting.link":
    "https://meet.google.com/... (ঐচ্ছিক)",
  "event.manager.form.color": "রঙ",
  "event.manager.form.participants": "অংশগ্রহণকারী",
  "event.manager.placeholder.participants": "অংশগ্রহণকারী নির্বাচন করুন...",
  "event.manager.weekday.su": "রবি",
  "event.manager.weekday.mo": "সোম",
  "event.manager.weekday.tu": "মঙ্গল",
  "event.manager.weekday.we": "বুধ",
  "event.manager.weekday.th": "বৃহঃ",
  "event.manager.weekday.fr": "শুক্র",
  "event.manager.weekday.sa": "শনি",
  "event.manager.dialog.edit.event": "ইভেন্ট সম্পাদনা",
  "event.manager.dialog.new.event": "নতুন ইভেন্ট",

  "event.manager.today": "আজ",
  "event.manager.view.month": "মাস",
  "event.manager.view.week": "সপ্তাহ",
  "event.manager.view.day": "দিন",

  "event.manager.all.day": "সারাদিন",
  "event.manager.join": "যোগদান",

  "event.manager.more.events": "+{{count}} আরো",
  "event.manager.weekday.sun": "রবি",
  "event.manager.weekday.mon": "সোম",
  "event.manager.weekday.tue": "মঙ্গল",
  "event.manager.weekday.wed": "বুধ",
  "event.manager.weekday.thu": "বৃহঃ",
  "event.manager.weekday.fri": "শুক্র",
  "event.manager.weekday.sat": "শনি",

  "event.manager.all.day.parens": "(সারাদিন)",
  "event.manager.time.to": "থেকে",

  "event.manager.delete.this.item": "এই আইটেমটি",

  "notification.create.success": "বিজ্ঞপ্তি সফলভাবে তৈরি হয়েছে",
  "notification.create.many.success":
    "{{count}}টি বিজ্ঞপ্তি সফলভাবে তৈরি হয়েছে",
  "notification.get.success": "বিজ্ঞপ্তি সফলভাবে পুনরুদ্ধার হয়েছে",
  "notification.get.by.ids.success":
    "আইডি অনুসারে বিজ্ঞপ্তিগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "notification.get.by.filter.success":
    "ফিল্টার অনুসারে বিজ্ঞপ্তিগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "notification.get.all.success": "বিজ্ঞপ্তিগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "notification.update.success": "বিজ্ঞপ্তি সফলভাবে হালনাগাদ হয়েছে",
  "notification.update.many.success":
    "{{count}}টি বিজ্ঞপ্তি সফলভাবে হালনাগাদ হয়েছে",
  "notification.delete.success": "বিজ্ঞপ্তি সফলভাবে মুছে ফেলা হয়েছে",
  "notification.restore.success": "বিজ্ঞপ্তি সফলভাবে পুনরুদ্ধার হয়েছে",
  "notification.not.found": "বিজ্ঞপ্তি পাওয়া যায়নি",
  "notification.mark.read.success": "বিজ্ঞপ্তি পঠিত হিসেবে চিহ্নিত",
  "notification.mark.all.read.success":
    "{{count}}টি বিজ্ঞপ্তি পঠিত হিসেবে চিহ্নিত",
  "notification.unread.count.success": "অপঠিত সংখ্যা পুনরুদ্ধার হয়েছে",
  "notification.send.success": "বিজ্ঞপ্তি সফলভাবে পাঠানো হয়েছে",
  "notification.broadcast.success":
    "{{count}}টি বিজ্ঞপ্তি সফলভাবে পাঠানো হয়েছে",

  "notification.empty.title": "এখনো কোনো বিজ্ঞপ্তি নেই",
  "notification.empty.subtitle": "আপনি সব আপডেট!",

  "language.create.success": "ভাষা সফলভাবে তৈরি হয়েছে",
  "language.create.many.success": "{{count}}টি ভাষা সফলভাবে তৈরি হয়েছে",
  "language.get.success": "ভাষা সফলভাবে পুনরুদ্ধার হয়েছে",
  "language.get.by.ids.success":
    "আইডি অনুসারে ভাষাগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "language.get.by.filter.success":
    "ফিল্টার অনুসারে ভাষাগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "language.get.all.success": "ভাষাগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "language.update.success": "ভাষা সফলভাবে হালনাগাদ হয়েছে",
  "language.update.many.success": "{{count}}টি ভাষা সফলভাবে হালনাগাদ হয়েছে",
  "language.delete.success": "ভাষা সফলভাবে মুছে ফেলা হয়েছে",
  "language.restore.success": "ভাষা সফলভাবে পুনরুদ্ধার হয়েছে",
  "language.active.success": "সক্রিয় ভাষাগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "language.set.default.success": "ডিফল্ট ভাষা সফলভাবে হালনাগাদ হয়েছে",
  "language.get.default.success": "ডিফল্ট ভাষা সফলভাবে পুনরুদ্ধার হয়েছে",

  "translation.key.create.success": "অনুবাদ কী সফলভাবে তৈরি হয়েছে",
  "translation.key.create.many.success":
    "{{count}}টি অনুবাদ কী সফলভাবে তৈরি হয়েছে",
  "translation.key.get.success": "অনুবাদ কী সফলভাবে পুনরুদ্ধার হয়েছে",
  "translation.key.get.by.ids.success":
    "আইডি অনুসারে অনুবাদ কীগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "translation.key.get.by.filter.success":
    "ফিল্টার অনুসারে অনুবাদ কীগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "translation.key.get.all.success": "অনুবাদ কীগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "translation.key.update.success": "অনুবাদ কী সফলভাবে হালনাগাদ হয়েছে",
  "translation.key.update.many.success":
    "{{count}}টি অনুবাদ কী সফলভাবে হালনাগাদ হয়েছে",
  "translation.key.delete.success": "অনুবাদ কী সফলভাবে মুছে ফেলা হয়েছে",
  "translation.key.restore.success": "অনুবাদ কী সফলভাবে পুনরুদ্ধার হয়েছে",
  "translation.key.modules.success": "মডিউলগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "translation.key.readonly.delete.forbidden":
    "শুধু-পাঠযোগ্য অনুবাদ কী মুছে ফেলা যাবে না: {{keys}}",
  "translation.key.readonly.update.forbidden":
    "সিস্টেম অনুবাদ কীর কী বা মডিউল পরিবর্তন করা যাবে না",
  "translation.key.duplicate.key.in.module":
    'অনুবাদ কী "{{key}}" ইতিমধ্যে মডিউল "{{module}}" এ বিদ্যমান',

  "translation.create.success": "অনুবাদ সফলভাবে তৈরি হয়েছে",
  "translation.create.many.success": "{{count}}টি অনুবাদ সফলভাবে তৈরি হয়েছে",
  "translation.get.success": "অনুবাদ সফলভাবে পুনরুদ্ধার হয়েছে",
  "translation.get.by.ids.success":
    "আইডি অনুসারে অনুবাদগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "translation.get.by.filter.success":
    "ফিল্টার অনুসারে অনুবাদগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "translation.get.all.success": "অনুবাদগুলো সফলভাবে পুনরুদ্ধার হয়েছে",
  "translation.update.success": "অনুবাদ সফলভাবে হালনাগাদ হয়েছে",
  "translation.update.many.success":
    "{{count}}টি অনুবাদ সফলভাবে হালনাগাদ হয়েছে",
  "translation.delete.success": "অনুবাদ সফলভাবে মুছে ফেলা হয়েছে",
  "translation.restore.success": "অনুবাদ সফলভাবে পুনরুদ্ধার হয়েছে",
  "translation.by.language.success": "অনুবাদগুলো সফলভাবে পুনরুদ্ধার হয়েছে",

  "localization.title": "স্থানীয়করণ",
  "localization.subtitle": "ভাষা এবং অনুবাদ ব্যবস্থাপনা করুন",
  "localization.tabs.languages": "ভাষা",
  "localization.tabs.keys": "কী",

  "localization.language.title": "ভাষাসমূহ",
  "localization.language.subtitle":
    "আপনার অ্যাপ্লিকেশনের জন্য উপলব্ধ ভাষা ব্যবস্থাপনা করুন",
  "localization.language.new": "ভাষা যোগ করুন",
  "localization.language.code": "ভাষা কোড",
  "localization.language.name": "ভাষার নাম",
  "localization.language.native.name": "স্থানীয় নাম",
  "localization.language.direction": "টেক্সট দিক",
  "localization.language.rtl": "RTL",
  "localization.language.ltr": "LTR",
  "localization.language.default": "ডিফল্ট",
  "localization.language.set.default": "ডিফল্ট হিসেবে সেট করুন",
  "localization.language.empty":
    "কোনো ভাষা কনফিগার করা নেই। শুরু করতে একটি ভাষা যোগ করুন।",
  "localization.language.confirm.set.default":
    '"{{name}}"-কে ডিফল্ট ভাষা হিসেবে সেট করবেন?',
  "localization.language.delete.title": "ভাষা মুছুন",

  "localization.language.edit": "ভাষা সম্পাদনা",
  "localization.placeholder.code": "en",
  "localization.language.iso.code.hint":
    "ISO 639-1 ভাষা কোড (যেমন, en, ar, fr)",
  "localization.placeholder.name": "English",
  "localization.placeholder.native.name": "English",
  "localization.language.native.name.hint":
    "স্থানীয় ভাষায় নাম (যেমন, আরবির জন্য العربية)",
  "localization.language.display.order": "প্রদর্শন ক্রম",
  "localization.language.direction.ltr": "বাম থেকে ডান (LTR)",
  "localization.language.direction.rtl": "ডান থেকে বাম (RTL)",
  "localization.validation.code.required": "ভাষা কোড প্রয়োজন",
  "localization.validation.code.max.length":
    "ভাষা কোড সর্বোচ্চ ১০ অক্ষরের হতে হবে",
  "localization.validation.name.required": "ভাষার নাম প্রয়োজন",
  "localization.validation.name.max.length":
    "ভাষার নাম সর্বোচ্চ ১০০ অক্ষরের হতে হবে",

  "localization.key.title": "অনুবাদ কী",
  "localization.key.subtitle":
    "আপনার অ্যাপ্লিকেশনের জন্য অনুবাদ কী ব্যবস্থাপনা করুন",
  "localization.key.new": "কী যোগ করুন",
  "localization.key.filter.module": "মডিউল অনুসারে ফিল্টার",
  "localization.key.module": "মডিউল",
  "localization.key.name": "কীর নাম",
  "localization.key.default.message": "ডিফল্ট বার্তা",
  "localization.key.translations": "অনুবাদ",
  "localization.key.empty": "কোনো অনুবাদ কী পাওয়া যায়নি",
  "localization.key.delete.title": "অনুবাদ কী মুছুন",

  "localization.key.edit": "কী সম্পাদনা",
  "localization.key.about": "কী তথ্য",
  "localization.placeholder.key.name": "button.submit",
  "localization.key.select.module": "মডিউল নির্বাচন বা লিখুন",
  "localization.placeholder.default.message": "ডিফল্ট মান লিখুন (ইংরেজি)",
  "localization.key.description": "বিবরণ",
  "localization.placeholder.key.description": "অনুবাদকদের জন্য ঐচ্ছিক বিবরণ",
  "localization.key.variables": "ভেরিয়েবল",
  "localization.key.variables.placeholder": "যেমন, name, count, date",
  "localization.key.variables.hint": "এই অনুবাদে ব্যবহৃত ভেরিয়েবল নাম লিখুন",
  "localization.key.translations.section": "অনুবাদ",
  "localization.key.no.languages": "কোনো সক্রিয় ভাষা কনফিগার করা নেই",
  "localization.key.enter.translation": "অনুবাদ লিখুন",
  "localization.validation.key.required": "অনুবাদ কী প্রয়োজন",
  "localization.validation.default.message.required": "ডিফল্ট বার্তা প্রয়োজন",
};

export const ARABIC_TRANSLATIONS = {
  "auth.token.required": "رمز التحديث مطلوب",
  "auth.token.invalid": "رمز غير صالح",
  "entity.belongs.another.company": "{{entity}} ينتمي إلى شركة أخرى",
  "auth.company.no.access": "لا يوجد وصول إلى هذه الشركة",

  "error.not.found": "المورد غير موجود",
  "error.validation": "فشل التحقق",
  "error.unauthorized": "وصول غير مصرح به",
  "error.forbidden": "الوصول محظور",
  "error.conflict": "تعارض في المورد",
  "error.internal": "خطأ داخلي في الخادم",
  "error.service.unavailable": "الخدمة غير متاحة مؤقتاً",
  "error.unknown": "حدث خطأ غير معروف",
  "error.http": "خطأ HTTP",
  "error.generic": "حدث خطأ",
  "error.permission.system.unavailable":
    "نظام الصلاحيات غير متاح مؤقتاً. يرجى المحاولة لاحقاً.",
  "error.insufficient.permissions":
    "الصلاحيات المطلوبة مفقودة: {{permissions}}",
  "error.insufficient.permissions.or":
    "يتطلب واحداً على الأقل من: {{permissions}}",
  "error.no.permissions.found":
    "لم يتم العثور على صلاحيات. يرجى الاتصال بالمسؤول.",
  "error.endpoint.disabled": "نقطة النهاية {{endpoint}} معطلة",

  "system.repository.not.available": "مستودع {{entity}} غير متاح",
  "system.datasource.not.available": "مصدر البيانات غير متاح",
  "system.database.config.not.available": "إعدادات قاعدة البيانات غير متاحة",
  "system.service.not.available":
    'الخدمة "{{provider}}" غير متاحة. المتاح: {{available}}',
  "system.config.required": "الإعدادات مطلوبة",
  "system.internal.error": 'فشل تهيئة "{{provider}}": {{error}}',
  "system.duplicate.request": "تم اكتشاف طلب مكرر",
  "system.invalid.tenant.id": "معرف المستأجر غير صالح",
  "system.tenant.not.found": 'المستأجر "{{tenantId}}" غير موجود',
  "system.tenant.header.required":
    'لم يتم العثور على المستأجر. تأكد من تعيين الترويسة "{{header}}".',
  "system.missing.parameter": "المعامل المطلوب مفقود: {{key}}",
  "system.sdk.not.installed":
    'SDK المطلوب "{{sdk}}" غير مثبت. شغّل: npm install {{sdk}}',
  "system.path.traversal.detected": "تم اكتشاف اجتياز المسار",
  "system.invalid.file.key": "مفتاح الملف غير صالح",

  "shared.success": "نجاح",
  "shared.error": "خطأ",
  "shared.info": "معلومات",
  "shared.warning": "تحذير",
  "shared.confirm.delete.header": "تأكيد الحذف",

  "shared.validation.error": "خطأ في التحقق",
  "shared.fill.required.fields": "يرجى ملء جميع الحقول المطلوبة",

  "shared.file.selector.provider.not.configured": "اختيار الملف غير مُعد.",
  "shared.file.selector.add.provider": "إضافة",
  "shared.close": "إغلاق",
  "shared.file.selector.search.placeholder": "البحث عن ملفات...",
  "shared.file.selector.all.folders": "جميع المجلدات",
  "shared.file.selector.all.storage": "جميع التخزين",
  "shared.default": "افتراضي",
  "shared.file.selector.selected": "{{count}} محدد",
  "shared.file.selector.no.files": "لم يتم العثور على ملفات",
  "shared.cancel": "إلغاء",
  "shared.file.selector.select.multiple": "اختيار ({{count}})",
  "shared.file.selector.select": "اختيار",
  "shared.file.selector.select.files": "اختيار الملفات",
  "shared.file.selector.select.file": "اختيار الملف",

  "shared.upload.provider.not.configured":
    "رفع الملف غير مُعد. أضف {{provider}} إلى إعدادات التطبيق.",
  "shared.upload.uploading": "جارٍ رفع {{fileName}}...",
  "shared.upload.drop.multiple": "اسحب الملفات هنا أو انقر للرفع",
  "shared.upload.drop.single": "اسحب الملف هنا أو انقر للرفع",
  "shared.upload.allowed.types": "مسموح:",
  "shared.upload.all.types.allowed": "جميع أنواع الملفات مسموحة",
  "shared.upload.max.size": "(الحد الأقصى {{size}}MB)",
  "shared.file.uploader.no.upload.function":
    "لا توجد دالة رفع متاحة. قم بتكوين FILE_PROVIDER أو قدم مدخل uploadFile.",
  "shared.file.type.images": "الصور",
  "shared.file.type.documents": "المستندات",
  "shared.file.type.videos": "الفيديو",
  "shared.file.type.audio": "الصوت",
  "shared.upload.invalid.type": "نوع ملف غير صالح",
  "shared.upload.file.too.large": "الملف كبير جداً",
  "shared.size.mb": "MB",
  "shared.upload.files": "ملفات",
  "shared.upload.complete": "اكتمل الرفع",
  "shared.upload.failed": "فشل الرفع",
  "shared.upload.files.uploaded": "تم رفع {{count}} ملف(ات) بنجاح",
  "shared.size.kb": "KB",

  "shared.select.placeholder": "اختر خياراً",

  "shared.multi.select.placeholder": "اختر الخيارات",
  "shared.multi.select.items.selected": "{{count}} عنصر محدد",

  "shared.user.select.placeholder": "اختر مستخدماً",

  "shared.actions": "الإجراءات",
  "shared.active": "نشط",
  "shared.add": "إضافة",
  "shared.created": "تم الإنشاء",
  "shared.all": "الكل",
  "shared.assigned": "مُعيّن",
  "shared.back": "رجوع",
  "shared.code": "رمز",
  "shared.company": "شركة",
  "shared.confirm": "تأكيد",
  "shared.confirm.delete": "هل أنت متأكد أنك تريد حذف هذا العنصر؟",
  "shared.confirm.delete.item": 'هل أنت متأكد أنك تريد حذف "{{name}}"؟',
  "shared.continue": "متابعة",
  "shared.create": "إنشاء",
  "shared.delete": "حذف",
  "shared.description": "الوصف",
  "shared.description.placeholder": "أدخل الوصف",
  "shared.deselect.all": "إلغاء تحديد الكل",
  "shared.display.order": "ترتيب العرض",
  "shared.display.order.placeholder": "أدخل ترتيب العرض",
  "shared.edit": "تعديل",
  "shared.error.bad.request": "طلب خاطئ",
  "shared.error.conflict": "تعارض",
  "shared.error.not.found": "غير موجود",
  "shared.error.server.error": "خطأ في الخادم",
  "shared.error.service.unavailable": "الخدمة غير متاحة",
  "shared.error.validation.error": "خطأ في التحقق",
  "shared.inactive": "غير نشط",
  "shared.invalid.email": "يرجى إدخال عنوان بريد إلكتروني صالح",
  "shared.loading.actions": "جارٍ تحميل الإجراءات...",
  "shared.loading.roles": "جارٍ تحميل الأدوار...",
  "shared.min.characters": "الحد الأدنى {{count}} حرف",
  "shared.na": "غير متاح",
  "shared.name": "الاسم",
  "shared.name.required": "الاسم مطلوب",
  "shared.no": "لا",
  "shared.no.results": "لم يتم العثور على نتائج",
  "shared.not.assigned": "غير مُعيّن",
  "shared.pending.changes": "تغييرات معلقة",
  "shared.read.only": "للقراءة فقط",
  "shared.remove": "إزالة",
  "shared.save": "حفظ",
  "shared.save.changes": "حفظ التغييرات",
  "shared.search": "بحث",
  "shared.select": "اختر...",
  "shared.select.all": "تحديد الكل",
  "shared.select.deselect.all": "تحديد/إلغاء تحديد الكل",
  "shared.status": "الحالة",
  "shared.to.add": "للإضافة",
  "shared.to.assign": "للتعيين",
  "shared.to.remove": "للإزالة",
  "shared.to.whitelist": "للقائمة البيضاء",
  "shared.type": "النوع",
  "shared.unexpected.error": "حدث خطأ غير متوقع",
  "shared.unknown": "غير معروف",
  "shared.update": "تحديث",
  "shared.upload": "رفع",
  "shared.validation.required": "{{field}} مطلوب",
  "shared.verified": "مُتحقق",
  "shared.view": "عرض",
  "shared.view.details": "عرض التفاصيل",
  "shared.yes": "نعم",
  "shared.validation": "التحقق",

  "primeng.accept": "نعم",
  "primeng.add.rule": "إضافة قاعدة",
  "primeng.apply": "تطبيق",
  "primeng.aria.cancel.edit": "إلغاء التعديل",
  "primeng.aria.close": "إغلاق",
  "primeng.aria.collapse.row": "صف مطوي",
  "primeng.aria.edit.row": "تعديل الصف",
  "primeng.aria.expand.row": "صف موسع",
  "primeng.aria.false.label": "خطأ",
  "primeng.aria.filter.constraint": "قيد التصفية",
  "primeng.aria.filter.operator": "معامل التصفية",
  "primeng.aria.first.page.label": "الصفحة الأولى",
  "primeng.aria.grid.view": "عرض شبكي",
  "primeng.aria.hide.filter.menu": "إخفاء قائمة التصفية",
  "primeng.aria.jump.to.page.dropdown.label": "القفز إلى قائمة الصفحة المنسدلة",
  "primeng.aria.jump.to.page.input.label": "القفز إلى إدخال الصفحة",
  "primeng.aria.last.page.label": "الصفحة الأخيرة",
  "primeng.aria.list.view": "عرض قائمة",
  "primeng.aria.move.all.to.source": "نقل الكل إلى المصدر",
  "primeng.aria.move.all.to.target": "نقل الكل إلى الهدف",
  "primeng.aria.move.bottom": "نقل إلى الأسفل",
  "primeng.aria.move.down": "نقل للأسفل",
  "primeng.aria.move.to.source": "نقل إلى المصدر",
  "primeng.aria.move.to.target": "نقل إلى الهدف",
  "primeng.aria.move.top": "نقل إلى الأعلى",
  "primeng.aria.move.up": "نقل للأعلى",
  "primeng.aria.navigation": "التنقل",
  "primeng.aria.next": "التالي",
  "primeng.aria.next.page.label": "الصفحة التالية",
  "primeng.aria.null.label": "غير محدد",
  "primeng.aria.page.label": "الصفحة {page}",
  "primeng.aria.prev.page.label": "الصفحة السابقة",
  "primeng.aria.previous": "السابق",
  "primeng.aria.rotate.left": "تدوير لليسار",
  "primeng.aria.rotate.right": "تدوير لليمين",
  "primeng.aria.rows.per.page.label": "الصفوف لكل صفحة",
  "primeng.aria.save.edit": "حفظ التعديل",
  "primeng.aria.scroll.top": "التمرير للأعلى",
  "primeng.aria.select.all": "تم تحديد جميع العناصر",
  "primeng.aria.select.row": "الصف محدد",
  "primeng.aria.show.filter.menu": "عرض قائمة التصفية",
  "primeng.aria.slide": "شريحة",
  "primeng.aria.slide.number": "{slideNumber}",
  "primeng.aria.star": "نجمة واحدة",
  "primeng.aria.stars": "{star} نجوم",
  "primeng.aria.true.label": "صحيح",
  "primeng.aria.unselect.all": "تم إلغاء تحديد جميع العناصر",
  "primeng.aria.unselect.row": "الصف غير محدد",
  "primeng.aria.zoom.image": "تكبير الصورة",
  "primeng.aria.zoom.in": "تكبير",
  "primeng.aria.zoom.out": "تصغير",
  "primeng.cancel": "إلغاء",
  "primeng.choose": "اختيار",
  "primeng.choose.date": "اختر التاريخ",
  "primeng.clear": "مسح",
  "primeng.contains": "يحتوي على",
  "primeng.date.after": "التاريخ بعد",
  "primeng.date.before": "التاريخ قبل",
  "primeng.date.is": "التاريخ هو",
  "primeng.date.is.not": "التاريخ ليس",
  "primeng.empty.filter.message": "لم يتم العثور على نتائج",
  "primeng.empty.message": "لم يتم العثور على نتائج",
  "primeng.empty.search.message": "لم يتم العثور على نتائج",
  "primeng.empty.selection.message": "لا يوجد عنصر محدد",
  "primeng.ends.with": "ينتهي بـ",
  "primeng.equals": "يساوي",
  "primeng.first.day.of.week": "0",
  "primeng.gt": "أكبر من",
  "primeng.gte": "أكبر من أو يساوي",
  "primeng.lt": "أصغر من",
  "primeng.lte": "أصغر من أو يساوي",
  "primeng.match.all": "مطابقة الكل",
  "primeng.match.any": "مطابقة أي",
  "primeng.no.filter": "لا يوجد تصفية",
  "primeng.not.contains": "لا يحتوي",
  "primeng.not.equals": "لا يساوي",
  "primeng.pending": "معلق",
  "primeng.reject": "لا",
  "primeng.remove.rule": "إزالة القاعدة",
  "primeng.selection.message": "{0} عنصر محدد",
  "primeng.starts.with": "يبدأ بـ",
  "primeng.today": "اليوم",
  "primeng.upload": "رفع",
  "primeng.week.header": "أسبوع",
  "primeng.choose.year": "اختر السنة",
  "primeng.choose.month": "اختر الشهر",
  "primeng.date.format": "mm/dd/yy",
  "primeng.weak": "ضعيف",
  "primeng.medium": "متوسط",
  "primeng.strong": "قوي",
  "primeng.password.prompt": "أدخل كلمة المرور",
  "primeng.country.placeholder": "اختر دولة",

  "layout.profile.title": "الملف الشخصي",
  "layout.profile.profile.picture.alt": "صورة الملف الشخصي",
  "layout.profile.copy.sign.up.link": "نسخ رابط التسجيل",
  "layout.profile.logout": "تسجيل الخروج",
  "layout.profile.guest": "زائر",
  "layout.profile.link.copied": "تم نسخ الرابط",
  "layout.profile.sign.up.link.copied": "تم نسخ رابط التسجيل.",
  "layout.profile.failed.copy.sign.up.link": "فشل نسخ رابط التسجيل.",

  "layout.launcher.apps": "التطبيقات",
  "layout.launcher.applications": "التطبيقات",

  "layout.company.branch.selector.title": "تبديل الشركة والفرع",
  "layout.company.branch.selector.select.company": "اختر الشركة",
  "layout.company.branch.selector.branch": "الفرع",
  "layout.company.branch.selector.select.branch": "اختر الفرع",
  "layout.company.branch.selector.switch.button": "تبديل",
  "layout.company.branch.selector.no.company": "لا توجد شركة",
  "layout.company.branch.selector.branch.required": "الفرع مطلوب",
  "layout.company.branch.selector.please.select.branch": "يرجى اختيار فرع",

  "layout.topbar.search": "بحث",
  "layout.topbar.search.placeholder": "البحث في المحتوى...",

  "layout.topbar.toggle.menu": "تبديل القائمة",
  "layout.topbar.toggle.dark.mode": "تبديل الوضع الداكن",
  "layout.topbar.open.theme.settings": "فتح إعدادات المظهر",
  "layout.topbar.more.options": "خيارات إضافية",

  "layout.configurator.primary": "أساسي",
  "layout.configurator.surface": "السطح",
  "layout.configurator.presets": "الإعدادات المسبقة",
  "layout.configurator.menu.mode": "وضع القائمة",
  "layout.configurator.menu.mode.static": "ثابت",
  "layout.configurator.menu.mode.overlay": "متراكب",
  "layout.configurator.menu.mode.topbar": "شريط علوي",

  "layout.footer.by": "بواسطة",

  "menu.dashboard": "لوحة التحكم",
  "menu.administration": "الإدارة",
  "menu.iam": "إدارة الهوية والوصول",
  "menu.storage": "التخزين",
  "menu.forms": "النماذج",
  "menu.email": "البريد الإلكتروني",
  "menu.event.manager": "مدير الأحداث",
  "menu.notifications": "الإشعارات",
  "menu.localization": "الترجمة",

  "notification.title": "الإشعارات",

  "notification.mark.all.read": "تعليم الكل كمقروء",
  "notification.view.all": "عرض جميع الإشعارات",
  "notification.empty": "لا توجد إشعارات",

  "notification.time.just.now": "الآن",
  "notification.time.minutes.ago": "منذ {{count}} دقيقة",
  "notification.time.hours.ago": "منذ {{count}} ساعة",
  "notification.time.days.ago": "منذ {{count}} يوم",

  "auth.login.success": "تم تسجيل الدخول بنجاح",
  "auth.login.requires.selection": "يرجى اختيار شركة وفرع للمتابعة",
  "auth.login.invalid.credentials": "بريد إلكتروني أو كلمة مرور غير صالحة",
  "auth.login.email.not.verified":
    "يرجى التحقق من بريدك الإلكتروني قبل تسجيل الدخول",
  "auth.login.account.deactivated": "تم تعطيل حسابك",
  "auth.logout.success": "تم تسجيل الخروج بنجاح",
  "auth.register.success": "تم إنشاء الحساب بنجاح",
  "auth.register.failed": "فشل التسجيل. يرجى المحاولة مرة أخرى.",
  "auth.refresh.success": "تم تحديث الرمز بنجاح",
  "auth.me.success": "تم استرجاع معلومات المستخدم بنجاح",
  "auth.select.success": "تم اختيار الشركة بنجاح",
  "auth.switch.company.success": "تم تبديل الشركة بنجاح",
  "auth.register.email.exists": "البريد الإلكتروني موجود بالفعل",
  "auth.register.company.already.assigned": "الشركة معيّنة بالفعل",
  "auth.password.change.success": "تم تغيير كلمة المرور بنجاح",
  "auth.password.change.invalid.current": "كلمة المرور الحالية غير صحيحة",
  "auth.password.change.current.required": "كلمة المرور الحالية مطلوبة",
  "auth.password.reset.email.sent": "تم إرسال بريد إعادة تعيين كلمة المرور",
  "auth.password.reset.success": "تم إعادة تعيين كلمة المرور بنجاح",
  "auth.token.expired": "انتهت صلاحية الرمز",
  "auth.token.revoked": "تم إلغاء الرمز",
  "auth.token.too.large": "رمز التحديث كبير جداً (≈{{size}} بايت)",
  "auth.company.list.success": "تم استرجاع شركات المستخدم بنجاح",
  "auth.company.not.found": "الشركة غير موجودة",
  "auth.company.required": "الشركة مطلوبة",
  "auth.company.feature.not.enabled": "هذه الميزة غير مفعّلة لشركتك",
  "auth.branch.list.success": "تم استرجاع فروع الشركة بنجاح",
  "auth.branch.no.access": "لا يوجد وصول إلى هذا الفرع",
  "auth.branch.not.found": "الفرع غير موجود",
  "auth.email.not.configured": "خدمة البريد الإلكتروني غير مُعدّة",
  "auth.email.send.failed": "فشل إرسال البريد الإلكتروني",
  "auth.session.invalid": "جلسة غير صالحة. يرجى تسجيل الدخول مرة أخرى.",
  "auth.session.not.available": "الجلسة غير متاحة",
  "auth.profile.access.denied": "رُفض الوصول إلى الملف الشخصي",
  "auth.profile.sections.not.supported": "أقسام الملف الشخصي غير مدعومة",
  "auth.logout.service.unavailable": "خدمة تسجيل الخروج غير متاحة",
  "auth.password.reset.token.expired":
    "انتهت صلاحية رمز إعادة تعيين كلمة المرور",
  "auth.password.reset.token.used":
    "تم استخدام رمز إعادة تعيين كلمة المرور بالفعل",

  "email.verification.sent": "تم إرسال بريد التحقق",
  "email.verification.success": "تم التحقق من البريد الإلكتروني بنجاح",
  "email.verification.token.invalid": "رمز التحقق غير صالح",
  "email.verification.token.expired": "انتهت صلاحية رمز التحقق",
  "email.verification.not.enabled": "التحقق من البريد الإلكتروني غير مفعّل",
  "email.verification.resend.success": "تم إعادة إرسال بريد التحقق بنجاح",

  "auth.session.expired.title": "انتهت صلاحية الجلسة",

  "auth.login.welcome": "مرحباً بعودتك!",
  "auth.login.sign.in.to.continue": "سجّل الدخول للمتابعة إلى حسابك",
  "auth.email.label": "عنوان البريد الإلكتروني",
  "auth.email.placeholder": "أدخل عنوان البريد الإلكتروني",
  "auth.password.label": "كلمة المرور",
  "auth.password.placeholder": "أدخل كلمة المرور",
  "auth.field.remember.me": "تذكرني",
  "auth.password.forgot": "نسيت كلمة المرور؟",
  "auth.login.sign.in": "تسجيل الدخول",
  "auth.login.no.account": "ليس لديك حساب؟",
  "auth.login.sign.up": "سجّل الآن",
  "auth.login.verify.email.message": "يرجى التحقق من بريدك الإلكتروني!",
  "auth.verify.resend": "إعادة إرسال بريد التحقق",
  "auth.login.back.to.sign.in": "العودة إلى تسجيل الدخول",
  "auth.login.select.company": "اختر الشركة",
  "auth.login.select.company.message": "يرجى اختيار شركة وفرع للمتابعة",
  "auth.login.select.company.option": "اختر شركة",
  "auth.login.branch.label": "الفرع",
  "auth.login.select.branch.option": "اختر فرعاً",
  "auth.login.remember.selection": "تذكر اختياري",
  "auth.validation.password.min.length":
    "يجب أن تكون كلمة المرور 8 أحرف على الأقل",
  "auth.validation.email.required": "البريد الإلكتروني مطلوب",
  "auth.validation.password.required": "كلمة المرور مطلوبة",
  "auth.validation.password.max.length": "كلمة المرور تتجاوز الحد الأقصى للطول",
  "auth.validation.password.pattern": "كلمة المرور لا تستوفي المتطلبات",
  "auth.validation.password.require.uppercase":
    "يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل",
  "auth.validation.password.require.lowercase":
    "يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل",
  "auth.validation.password.require.number":
    "يجب أن تحتوي كلمة المرور على رقم واحد على الأقل",
  "auth.validation.password.require.special":
    "يجب أن تحتوي كلمة المرور على رمز خاص واحد على الأقل",
  "auth.validation.company.required": "يرجى اختيار شركة",
  "auth.validation.branch.required": "يرجى اختيار فرع",
  "auth.login.title": "تسجيل الدخول",
  "auth.session.expired": "انتهت صلاحية جلستك. يرجى تسجيل الدخول مرة أخرى.",

  "auth.forgot.password.title": "نسيت كلمة المرور",
  "auth.forgot.password.subtitle":
    "أدخل عنوان بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين.",
  "auth.forgot.password.send.reset.link": "إرسال رابط إعادة التعيين",
  "auth.forgot.password.remember.password": "تتذكر كلمة المرور؟",
  "auth.forgot.password.check.email": "تحقق من بريدك الإلكتروني",
  "auth.forgot.password.email.sent.to":
    "أرسلنا رابط إعادة تعيين كلمة المرور إلى {{email}}",
  "auth.forgot.password.didnt.receive": "لم تستلم البريد الإلكتروني؟",
  "auth.forgot.password.try.again": "حاول مرة أخرى",

  "auth.register.create.account": "إنشاء حساب",
  "auth.register.subtitle": "املأ بياناتك لإنشاء حساب.",
  "auth.register.full.name": "الاسم الكامل",
  "auth.register.name.placeholder": "أدخل اسمك الكامل",
  "auth.phone.label": "رقم الهاتف",
  "auth.phone.placeholder": "أدخل رقم الهاتف",
  "auth.register.confirm.password": "تأكيد كلمة المرور",
  "auth.register.confirm.password.placeholder": "أكّد كلمة المرور",
  "auth.register.passwords.do.not.match": "كلمات المرور غير متطابقة",
  "auth.register.company.details": "تفاصيل الشركة",
  "auth.register.join.default.company": "الانضمام إلى الشركة الافتراضية",
  "auth.register.join.or.create.company": "الانضمام إلى شركة أو إنشاؤها",
  "auth.register.create.new.company": "إنشاء شركة جديدة",
  "auth.register.company.code": "رمز الشركة",
  "auth.register.preconfigured.company": "شركة مُعدّة مسبقاً",
  "auth.register.company.code.placeholder": "أدخل رمز الشركة",
  "auth.register.enter.company.code": "أدخل رمز الشركة للانضمام",
  "auth.register.branch.code": "رمز الفرع",
  "auth.register.preconfigured.branch": "فرع مُعدّ مسبقاً",
  "auth.register.branch.code.placeholder": "أدخل رمز الفرع",
  "auth.register.company.name": "اسم الشركة",
  "auth.register.company.name.placeholder": "أدخل اسم الشركة",
  "auth.address.label": "العنوان",
  "auth.address.placeholder": "أدخل العنوان",
  "auth.register.already.have.account": "لديك حساب بالفعل؟",
  "auth.validation.name.min.length": "يجب أن يكون الاسم {{min}} أحرف على الأقل",
  "auth.validation.confirm.password.required": "يرجى تأكيد كلمة المرور",

  "auth.verify.email.verifying": "جارٍ التحقق من البريد الإلكتروني",
  "auth.verify.email.please.wait":
    "يرجى الانتظار بينما نتحقق من عنوان بريدك الإلكتروني...",
  "auth.verify.email.success": "تم التحقق من البريد الإلكتروني",
  "auth.verify.email.success.message":
    "تم التحقق من بريدك الإلكتروني بنجاح. يمكنك الآن تسجيل الدخول إلى حسابك.",
  "auth.verify.email.failed": "فشل التحقق",
  "auth.verify.email.invalid.link":
    "رابط التحقق هذا غير صالح أو انتهت صلاحيته.",
  "auth.verify.email.resend.email": "إعادة إرسال بريد التحقق",
  "auth.verify.email.resend.title": "إعادة إرسال التحقق",
  "auth.verify.email.resend.subtitle":
    "أدخل بريدك الإلكتروني لاستلام رابط تحقق جديد.",
  "auth.verify.email.resend": "إعادة إرسال البريد",
  "auth.verify.email.sent":
    "تم إرسال بريد التحقق. يرجى التحقق من صندوق الوارد.",

  "auth.reset.password.title": "إعادة تعيين كلمة المرور",
  "auth.reset.password.subtitle": "أدخل كلمة المرور الجديدة أدناه.",
  "auth.reset.password.new.password": "كلمة المرور الجديدة",
  "auth.reset.password.new.password.placeholder": "أدخل كلمة المرور الجديدة",
  "auth.reset.password.confirm.password": "تأكيد كلمة المرور",
  "auth.reset.password.confirm.password.placeholder":
    "أكّد كلمة المرور الجديدة",
  "auth.reset.password.reset.password": "إعادة تعيين كلمة المرور",
  "auth.reset.password.success": "تمت إعادة تعيين كلمة المرور بنجاح",
  "auth.reset.password.success.message":
    "تمت إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.",
  "auth.reset.password.invalid.link": "رابط إعادة تعيين غير صالح",
  "auth.reset.password.invalid.link.message":
    "رابط إعادة تعيين كلمة المرور هذا غير صالح أو انتهت صلاحيته.",
  "auth.reset.password.request.new.link": "طلب رابط جديد",

  "user.create.success": "تم إنشاء المستخدم بنجاح",
  "user.create.many.success": "تم إنشاء {{count}} مستخدم بنجاح",
  "user.get.success": "تم استرجاع المستخدم بنجاح",
  "user.get.by.ids.success": "تم استرجاع المستخدمين بالمعرفات بنجاح",
  "user.update.success": "تم تحديث المستخدم بنجاح",
  "user.update.many.success": "تم تحديث {{count}} مستخدم بنجاح",
  "user.get.by.filter.success": "تم استرجاع المستخدمين بالفلتر بنجاح",
  "user.get.all.success": "تم استرجاع المستخدمين بنجاح",
  "user.delete.success": "تم حذف المستخدم بنجاح",
  "user.restore.success": "تم استرجاع المستخدم بنجاح",
  "user.not.found": "المستخدم غير موجود",
  "user.profile.update.success": "تم تحديث الملف الشخصي بنجاح",
  "user.profile.extras.success": "تم استرجاع إضافات الملف الشخصي بنجاح",
  "user.profile.sections.success": "تم استرجاع أقسام الملف الشخصي بنجاح",
  "user.profile.section.data.success":
    "تم استرجاع بيانات قسم الملف الشخصي بنجاح",
  "user.profile.section.update.success": "تم تحديث قسم الملف الشخصي بنجاح",
  "user.profile.completion.success": "تم استرجاع اكتمال الملف الشخصي بنجاح",
  "user.email.verify.success": "تم التحقق من البريد الإلكتروني بنجاح",
  "user.phone.verify.success": "تم التحقق من الهاتف بنجاح",
  "user.status.update.success": "تم تحديث حالة المستخدم بنجاح",

  "company.create.success": "تم إنشاء الشركة بنجاح",
  "company.create.many.success": "تم إنشاء {{count}} شركة بنجاح",
  "company.get.success": "تم استرجاع الشركة بنجاح",
  "company.get.by.ids.success": "تم استرجاع الشركات بالمعرفات بنجاح",
  "company.get.by.filter.success": "تم استرجاع الشركات بالفلتر بنجاح",
  "company.update.success": "تم تحديث الشركة بنجاح",
  "company.update.many.success": "تم تحديث {{count}} شركة بنجاح",
  "company.get.all.success": "تم استرجاع الشركات بنجاح",
  "company.delete.success": "تم حذف الشركة بنجاح",
  "company.restore.success": "تم استرجاع الشركة بنجاح",

  "branch.create.success": "تم إنشاء الفرع بنجاح",
  "branch.create.many.success": "تم إنشاء {{count}} فرع بنجاح",
  "branch.get.success": "تم استرجاع الفرع بنجاح",
  "branch.get.by.ids.success": "تم استرجاع الفروع بالمعرفات بنجاح",
  "branch.get.by.filter.success": "تم استرجاع الفروع بالفلتر بنجاح",
  "branch.update.success": "تم تحديث الفرع بنجاح",
  "branch.update.many.success": "تم تحديث {{count}} فرع بنجاح",
  "branch.get.all.success": "تم استرجاع الفروع بنجاح",
  "branch.delete.success": "تم حذف الفرع بنجاح",
  "branch.restore.success": "تم استرجاع الفرع بنجاح",

  "user.permission.company.list.success": "تم استرجاع شركات المستخدم بنجاح",
  "user.permission.branch.list.success": "تم استرجاع فروع المستخدم بنجاح",
  "user.permission.batch.success":
    "تمت معالجة {{added}} إضافة و{{removed}} إزالة",
  "user.permission.already.assigned": "المستخدم مُعيّن بالفعل لهذا {{type}}",
  "user.permission.not.found": "صلاحية {{type}} غير موجودة",

  "administrative.permission.manage.company": "إدارة صلاحيات الشركة",
  "administrative.permission.user": "المستخدم",
  "administrative.company.no.companies": "لم يتم العثور على شركات",

  "administrative.permission.manage.branch": "إدارة صلاحيات الفرع",
  "administrative.company.select": "اختر الشركة",
  "administrative.permission.no.company":
    "لا توجد صلاحيات شركة معيّنة لهذا المستخدم.",
  "administrative.permission.assign.company.first":
    "عيّن صلاحيات الشركة أولاً قبل إدارة الوصول إلى الفرع.",
  "administrative.permission.select.company.for.branches":
    "يرجى اختيار شركة لعرض الفروع.",
  "administrative.branch.no.branches": "لم يتم العثور على فروع",

  "administrative.title": "الإدارة",
  "administrative.subtitle": "إدارة المستخدمين والشركات والفروع",
  "administrative.user.title": "المستخدمون",
  "administrative.company.title": "الشركات",
  "administrative.branch.title": "الفروع",

  "administrative.branch.new": "فرع جديد",
  "administrative.branch.edit": "تعديل الفرع",
  "administrative.branch.name": "اسم الفرع",
  "administrative.branch.name.placeholder": "أدخل اسم الفرع",
  "administrative.branch.slug": "معرّف الفرع",
  "administrative.branch.slug.placeholder": "أدخل معرّف الفرع",
  "administrative.email.label": "البريد الإلكتروني",
  "administrative.email.placeholder": "أدخل عنوان البريد الإلكتروني",
  "administrative.phone.label": "الهاتف",
  "administrative.phone.placeholder": "أدخل رقم الهاتف",
  "administrative.address.label": "العنوان",
  "administrative.address.placeholder": "أدخل العنوان",
  "administrative.branch.slug.required": "معرّف الفرع مطلوب",

  "administrative.branch.add": "إضافة فرع",
  "administrative.branch.select.company.first": "يرجى اختيار شركة أولاً",
  "administrative.branch.delete.title": "حذف الفرع",

  "administrative.company.edit": "تعديل الشركة",
  "administrative.company.new": "شركة جديدة",
  "administrative.company.name": "اسم الشركة",
  "administrative.company.name.placeholder": "أدخل اسم الشركة",
  "administrative.company.slug": "معرّف الشركة",
  "administrative.company.slug.placeholder": "أدخل معرّف الشركة",
  "administrative.company.website": "الموقع الإلكتروني",
  "administrative.company.website.placeholder": "أدخل رابط الموقع",
  "administrative.company.slug.required": "معرّف الشركة مطلوب",

  "administrative.company.add": "إضافة شركة",
  "administrative.branch.view.branches": "عرض الفروع",
  "administrative.company.delete.title": "حذف الشركة",

  "administrative.user.edit": "تعديل المستخدم",
  "administrative.user.new": "مستخدم جديد",
  "administrative.user.name": "الاسم",
  "administrative.user.name.placeholder": "أدخل الاسم الكامل",
  "administrative.user.password": "كلمة المرور",
  "administrative.user.password.optional": "(اتركها فارغة للإبقاء على الحالية)",
  "administrative.user.password.placeholder": "أدخل كلمة المرور",
  "administrative.user.email.verified": "البريد الإلكتروني مُتحقق",
  "administrative.user.auto.assign.to":
    "سيتم تعيين المستخدم الجديد تلقائياً إلى",

  "administrative.user.add": "إضافة مستخدم",
  "administrative.permission.company.permissions": "صلاحيات الشركة",
  "administrative.permission.branch.permissions": "صلاحيات الفرع",
  "administrative.user.no.users": "لم يتم العثور على مستخدمين",
  "administrative.user.details": "تفاصيل المستخدم",
  "administrative.user.delete.title": "حذف المستخدم",

  "profile.title": "الملف الشخصي",
  "profile.subtitle": "إدارة إعدادات حسابك وتفضيلاتك.",
  "profile.storage.not.enabled":
    "رفع صورة الملف الشخصي غير متاح. خدمة التخزين غير مُعدّة.",
  "profile.name.label": "الاسم الكامل",
  "profile.name.placeholder": "أدخل اسمك الكامل",
  "profile.phone.label": "الهاتف",
  "profile.phone.placeholder": "أدخل رقم الهاتف",
  "profile.additional.info": "معلومات إضافية",
  "profile.employment.info": "معلومات التوظيف",
  "profile.managed.by.admin": "هذا الحقل يُدار من قِبل المسؤول.",
  "profile.security": "الأمان",
  "profile.current.password": "كلمة المرور الحالية",
  "profile.current.password.placeholder": "أدخل كلمة المرور الحالية",
  "profile.new.password": "كلمة المرور الجديدة",
  "profile.confirm.password": "تأكيد كلمة المرور الجديدة",
  "profile.confirm.password.placeholder": "أكّد كلمة المرور الجديدة",
  "profile.change.password": "تغيير كلمة المرور",
  "profile.company.branch": "الشركة والفرع",
  "profile.branch.label": "الفرع",
  "profile.actions.label": "الإجراءات المباشرة",
  "profile.actions.none.assigned": "لا توجد إجراءات معيّنة",
  "profile.permissions.label": "صلاحياتي",
  "profile.roles.label": "الأدوار",
  "profile.roles.none.assigned": "لا توجد أدوار معيّنة",

  "action.create.success": "تم إنشاء الإجراء بنجاح",
  "action.create.many.success": "تم إنشاء {{count}} إجراء بنجاح",
  "action.get.success": "تم استرجاع الإجراء بنجاح",
  "action.get.by.ids.success": "تم استرجاع الإجراءات بالمعرفات بنجاح",
  "action.get.by.filter.success": "تم استرجاع الإجراءات بالفلتر بنجاح",
  "action.get.all.success": "تم استرجاع الإجراءات بنجاح",
  "action.update.success": "تم تحديث الإجراء بنجاح",
  "action.update.many.success": "تم تحديث {{count}} إجراء بنجاح",
  "action.delete.success": "تم حذف الإجراء بنجاح",
  "action.restore.success": "تم استرجاع الإجراء بنجاح",

  "role.create.success": "تم إنشاء الدور بنجاح",
  "role.create.many.success": "تم إنشاء {{count}} دور بنجاح",
  "role.get.success": "تم استرجاع الدور بنجاح",
  "role.get.by.ids.success": "تم استرجاع الأدوار بالمعرفات بنجاح",
  "role.get.by.filter.success": "تم استرجاع الأدوار بالفلتر بنجاح",
  "role.get.all.success": "تم استرجاع الأدوار بنجاح",
  "role.update.success": "تم تحديث الدور بنجاح",
  "role.update.many.success": "تم تحديث {{count}} دور بنجاح",
  "role.delete.success": "تم حذف الدور بنجاح",
  "role.restore.success": "تم استرجاع الدور بنجاح",

  "permission.process.success":
    "تمت معالجة {{total}} عنصر بنجاح: {{added}} مضاف، {{removed}} مُزال",
  "permission.user.required": "المستخدم مطلوب لـ {{method}}",
  "permission.already.exists": "الصلاحية موجودة بالفعل",

  "role.permission.actions.success": "تم استرجاع إجراءات الدور بنجاح",
  "role.permission.user.roles.success": "تم استرجاع أدوار المستخدم بنجاح",

  "user.action.permission.get.success":
    "تم استرجاع صلاحيات إجراءات المستخدم بنجاح",

  "company.action.permission.get.success":
    "تم استرجاع صلاحيات إجراءات الشركة بنجاح",

  "my.permission.get.success": "تم تحميل الصلاحيات بنجاح",

  "iam.direct.mode.unavailable":
    "تعيين الصلاحية المباشرة غير متاح في وضع RBAC فقط",
  "iam.rbac.mode.unavailable":
    "تعيين الصلاحية القائمة على الأدوار غير متاح في وضع المباشر فقط",
  "iam.role.assignment.unavailable":
    "تعيين الأدوار غير متاح في وضع المباشر فقط",

  "iam.title": "إدارة الهوية والوصول",
  "iam.subtitle": "إدارة الأدوار والصلاحيات والتحكم في الوصول",
  "iam.action.title": "الإجراءات",
  "iam.role.title": "الأدوار",
  "iam.permission.title": "الصلاحيات",

  "iam.action.new": "إجراء جديد",
  "iam.action.name": "اسم الإجراء",
  "iam.action.code": "رمز الإجراء",
  "iam.action.type": "النوع",
  "iam.action.no.actions": "لم يتم العثور على إجراءات",
  "iam.action.type.backend": "الواجهة الخلفية",
  "iam.action.type.frontend": "الواجهة الأمامية",
  "iam.action.type.both": "كلاهما",
  "iam.action.delete.title": "حذف الإجراء",
  "iam.action.edit": "تعديل الإجراء",

  "iam.action.name.placeholder": "أدخل اسم الإجراء",
  "iam.action.code.placeholder": "أدخل رمز الإجراء",
  "iam.action.parent": "الإجراء الأصل",
  "iam.action.select.parent": "اختر الإجراء الأصل",
  "iam.action.type.backend.label": "الواجهة الخلفية فقط",
  "iam.action.type.frontend.label": "الواجهة الأمامية فقط",
  "iam.action.type.both.label": "الواجهة الخلفية والأمامية",

  "iam.company.title": "الشركات",
  "iam.role.new": "دور جديد",
  "iam.role.name": "اسم الدور",
  "iam.role.no.roles": "لم يتم العثور على أدوار",
  "iam.role.delete.title": "حذف الدور",

  "iam.role.edit": "تعديل الدور",
  "iam.role.name.placeholder": "أدخل اسم الدور",

  "iam.permission.role.actions": "إجراءات الدور",
  "iam.permission.user.roles": "أدوار المستخدم",
  "iam.permission.user.actions": "إجراءات المستخدم",
  "iam.permission.company.actions": "إجراءات الشركة",

  "iam.logic.title": "منطق الصلاحيات",
  "iam.logic.add.logic": "إضافة منطق",
  "iam.logic.clear.logic": "مسح المنطق",
  "iam.logic.description":
    "حدد متطلبات الصلاحيات باستخدام منطق AND/OR مع الإجراءات",
  "iam.logic.click.to.toggle": "انقر للتبديل",
  "iam.logic.conditions": "{{count}} شرط",
  "iam.logic.select.action": "اختر إجراءً...",
  "iam.logic.actions.available": "{{count}} متاح",
  "iam.logic.add.condition": "إضافة شرط:",
  "iam.logic.group": "مجموعة",
  "iam.logic.action": "إجراء",

  "iam.permission.select.role": "اختر الدور",
  "iam.permission.select.role.placeholder": "ابحث واختر دوراً",
  "iam.permission.action.permissions": "صلاحيات الإجراء",
  "iam.permission.actions.available": "{{count}} إجراء متاح",
  "iam.validation.warning.title": "تحذير التحقق",
  "iam.validation.unmet.prerequisites.plural":
    "{{count}} إجراءات محددة لها متطلبات غير مستوفاة. قم بإصلاحها قبل الحفظ أو استخدم الإصلاح التلقائي عند الحفظ.",
  "iam.validation.unmet.prerequisites.singular":
    "{{count}} إجراء محدد له متطلبات غير مستوفاة. قم بإصلاحه قبل الحفظ أو استخدم الإصلاح التلقائي عند الحفظ.",
  "iam.permission.requirements": "المتطلبات",
  "iam.validation.unmet.prerequisites.tooltip":
    "هذا الإجراء لديه متطلبات غير مستوفاة وسيفشل في التحقق عند الحفظ",
  "iam.permission.has.prerequisites": "لديه متطلبات مسبقة",
  "iam.permission.no.actions.available": "لا توجد إجراءات متاحة",
  "iam.permission.no.actions.for.role": "لا توجد إجراءات متاحة لهذا الدور",
  "iam.tooltip.remove.action": "انقر للإزالة",
  "iam.tooltip.add.action": "انقر للإضافة (يحدد المطلوبة تلقائياً)",
  "iam.tooltip.assigned.to.role": "مُعيّن للدور",
  "iam.tooltip.click.to.remove.role": "انقر للإزالة",
  "iam.tooltip.click.to.assign.role": "انقر للتعيين للدور",

  "iam.permission.select.user": "اختر المستخدم",
  "iam.permission.select.user.placeholder": "ابحث واختر مستخدماً",
  "iam.permission.select.branch": "اختر الفرع",
  "iam.permission.select.branch.placeholder": "ابحث واختر فرعاً",
  "iam.branch.permitted.count.plural":
    "{{count}} فرع مسموح به في الشركة الحالية",
  "iam.branch.permitted.count": "{{count}} فرع مسموح به في الشركة الحالية",
  "iam.permission.direct.action.permissions": "صلاحيات الإجراء المباشرة",
  "iam.permission.no.actions.for.user": "لا توجد إجراءات متاحة لهذا المستخدم",
  "iam.tooltip.assigned.to.user": "مُعيّن للمستخدم",
  "iam.tooltip.click.to.remove.user": "انقر لإزالة الصلاحية المباشرة",
  "iam.tooltip.click.to.assign.user": "انقر لتعيين صلاحية مباشرة",
  "iam.permission.company.required": "يرجى اختيار شركة أولاً",

  "iam.permission.select.company": "اختر الشركة",
  "iam.permission.select.company.placeholder": "ابحث واختر شركة",
  "iam.permission.action.whitelist": "القائمة البيضاء للإجراءات",
  "iam.permission.no.actions.for.company": "لا توجد إجراءات متاحة لهذه الشركة",
  "iam.tooltip.selected": "محدد",
  "iam.tooltip.click.to.remove": "انقر للإزالة من القائمة البيضاء للشركة",
  "iam.tooltip.click.to.add": "انقر للإضافة إلى القائمة البيضاء للشركة",
  "iam.permission.requires": "يتطلب",
  "iam.permission.prerequisite.validation.failed":
    "فشل التحقق من المتطلبات المسبقة",
  "iam.permission.prerequisite.error.message":
    "الإجراءات التالية لها متطلبات غير مستوفاة:",
  "iam.permission.auto.select.required": "تحديد تلقائي للمطلوب",
  "iam.permission.actions.selected": "الإجراءات المحددة",
  "iam.permission.auto.selected.prerequisites":
    "تم تحديد المتطلبات المسبقة تلقائياً. انقر على حفظ لتطبيق التغييرات.",
  "iam.permission.changes.reverted": "تم التراجع عن التغييرات",
  "iam.permission.selection.reverted":
    "تم التراجع عن التحديد إلى الحالة الأولية.",

  "iam.permission.role.assignments": "تعيينات الأدوار",
  "iam.permission.roles.available": "{{count}} دور متاح",
  "iam.pagination.roles.template":
    "عرض {first} إلى {last} من {totalRecords} دور",
  "iam.permission.no.roles.available": "لا توجد أدوار متاحة",
  "iam.permission.no.roles.for.user": "لا توجد أدوار متاحة لهذا المستخدم",
  "iam.tooltip.click.to.remove.role.from.user": "انقر لإزالة الدور",
  "iam.tooltip.click.to.assign.role.to.user": "انقر لتعيين الدور للمستخدم",

  "iam.logic.unknown.action": "إجراء غير معروف",
  "iam.logic.validation.failed": "فشل التحقق",
  "iam.logic.validation.failed.message":
    "الإجراءات التالية لها متطلبات غير مستوفاة:",
  "iam.logic.validation.failed.prompt": "هل تريد:",
  "iam.logic.auto.fix": "الإصلاح التلقائي (إزالة غير الصالحة)",
  "iam.logic.invalid.actions.removed": "تمت إزالة الإجراءات غير الصالحة",
  "iam.logic.removed.actions.detail":
    "تمت إزالة {{count}} إجراء(ات) بمتطلبات غير مستوفاة. يمكنك الحفظ الآن.",
  "iam.logic.save.cancelled": "تم إلغاء الحفظ",
  "iam.logic.fix.prerequisites.manually":
    "يرجى إصلاح المتطلبات يدوياً قبل الحفظ",
  "iam.logic.prerequisites.satisfied": "[موافق] المتطلبات مستوفاة",
  "iam.logic.all.required.selected":
    "جميع الإجراءات المطلوبة محددة بالفعل.\nيمكنك إضافة هذا الإجراء بأمان.",
  "iam.logic.prerequisites.required": "متطلبات مطلوبة ({{count}} مفقود)",
  "iam.logic.click.to.auto.select": "انقر لتحديد الإجراءات المطلوبة تلقائياً",
  "iam.logic.select.action.label": "اختر إجراءً",
  "iam.logic.auto.select.actions": "تحديد الإجراءات تلقائياً",
  "iam.logic.action.selected.detail":
    "تم تحديد الإجراء بنجاح (المتطلبات مستوفاة بالفعل)",
  "iam.logic.auto.selected.detail":
    "تم تحديد {{count}} إجراء(ات) تلقائياً بما في ذلك المتطلبات",
  "iam.logic.minimum.required": " (الحد الأدنى المطلوب)",
  "iam.logic.auto.select.prompt":
    "سيحدد التحديد التلقائي {{count}} إجراء(ات){{suffix}}.",
  "iam.logic.missing.prerequisites": "متطلبات مفقودة",
  "iam.logic.requires.conditions": "يتطلب استيفاء الشروط التالية:",
  "iam.logic.would.you.continue": "هل تريد المتابعة؟",
  "iam.logic.actions.selected.summary": "الإجراءات المحددة",
  "iam.logic.selection.cancelled": "تم إلغاء التحديد",
  "iam.logic.action.not.added": "لم تتم إضافة الإجراء إلى القائمة البيضاء",
  "iam.logic.required.by.actions": "مطلوب من قِبل الإجراءات التالية:",
  "iam.logic.alternatives.available": "خيارات بديلة متاحة:",
  "iam.logic.switch.to.alternatives": "هل تريد التبديل تلقائياً إلى البدائل؟",
  "iam.logic.remove.dependents": "إزالة هذا ستزيل أيضاً الإجراء(ات) التابعة.",
  "iam.logic.dependency.warning": "تحذير التبعية",
  "iam.logic.use.alternatives": "استخدام البدائل",
  "iam.logic.remove.all": "إزالة الكل",
  "iam.logic.alternatives.applied": "تم تطبيق البدائل",
  "iam.logic.switched.to.alternatives":
    "تم التبديل تلقائياً إلى إجراء(ات) بديلة",
  "iam.logic.actions.removed": "تمت إزالة الإجراءات",
  "iam.logic.removed.with.dependents":
    "تمت إزالة {{name}} و{{count}} إجراء(ات) تابعة",
  "iam.logic.cancelled": "ملغى",
  "iam.logic.no.changes.made": "لم يتم إجراء أي تغييرات",
  "iam.logic.satisfied": "(مستوفى)",
  "iam.logic.missing": "(مفقود)",
  "iam.logic.invalid.node": "عقدة منطق غير صالحة",
  "iam.logic.invalid": "(غير صالح)",

  "file.create.success": "تم إنشاء الملف بنجاح",
  "file.create.many.success": "تم إنشاء {{count}} ملف بنجاح",
  "file.get.success": "تم استرجاع الملف بنجاح",
  "file.get.by.ids.success": "تم استرجاع الملفات بالمعرفات بنجاح",
  "file.get.by.filter.success": "تم استرجاع الملفات بالفلتر بنجاح",
  "file.get.all.success": "تم استرجاع الملفات بنجاح",
  "file.update.success": "تم تحديث الملف بنجاح",
  "file.update.many.success": "تم تحديث {{count}} ملف بنجاح",
  "file.delete.success": "تم حذف الملف بنجاح",
  "file.restore.success": "تم استرجاع الملف بنجاح",
  "file.not.found": "الملف غير موجود",

  "folder.create.success": "تم إنشاء المجلد بنجاح",
  "folder.create.many.success": "تم إنشاء {{count}} مجلد بنجاح",
  "folder.get.success": "تم استرجاع المجلد بنجاح",
  "folder.get.by.ids.success": "تم استرجاع المجلدات بالمعرفات بنجاح",
  "folder.get.by.filter.success": "تم استرجاع المجلدات بالفلتر بنجاح",
  "folder.get.all.success": "تم استرجاع المجلدات بنجاح",
  "folder.update.success": "تم تحديث المجلد بنجاح",
  "folder.update.many.success": "تم تحديث {{count}} مجلد بنجاح",
  "folder.delete.success": "تم حذف المجلد بنجاح",
  "folder.restore.success": "تم استرجاع المجلد بنجاح",
  "folder.not.found": "المجلد غير موجود",

  "storage.config.create.success": "تم إنشاء إعدادات التخزين بنجاح",
  "storage.config.create.many.success":
    "تم إنشاء {{count}} إعدادات تخزين بنجاح",
  "storage.config.get.success": "تم استرجاع إعدادات التخزين بنجاح",
  "storage.config.get.by.ids.success":
    "تم استرجاع إعدادات التخزين بالمعرفات بنجاح",
  "storage.config.get.by.filter.success":
    "تم استرجاع إعدادات التخزين بالفلتر بنجاح",
  "storage.config.get.all.success": "تم استرجاع إعدادات التخزين بنجاح",
  "storage.config.update.success": "تم تحديث إعدادات التخزين بنجاح",
  "storage.config.update.many.success":
    "تم تحديث {{count}} إعدادات تخزين بنجاح",
  "storage.config.delete.success": "تم حذف إعدادات التخزين بنجاح",
  "storage.config.restore.success": "تم استرجاع إعدادات التخزين بنجاح",

  "upload.success": "تم رفع الملف بنجاح",
  "upload.many.success": "تم رفع الملفات بنجاح",
  "upload.file.too.large":
    "حجم الملف ({{fileSize}}MB) يتجاوز الحد الأقصى {{maxSize}}MB",
  "upload.invalid.type":
    'نوع الملف "{{mimeType}}" غير مسموح. المسموح: {{allowedTypes}}',
  "upload.no.files.provided": "لم يتم تقديم ملفات",
  "upload.no.file.path": "مسار الملف مطلوب",
  "upload.invalid.file.path": "مسار ملف غير صالح",
  "upload.config.not.found": "إعدادات الرفع غير موجودة",

  "storage.title": "التخزين",
  "storage.subtitle": "إدارة الملفات والمجلدات وإعدادات التخزين",
  "storage.file.title": "الملفات",
  "storage.folder.title": "إعداد المجلدات",
  "storage.config.title": "إعدادات التخزين",

  "storage.button.new.configuration": "إعدادات جديدة",
  "storage.table.provider": "المزوّد",
  "storage.table.created": "تاريخ الإنشاء",
  "storage.empty.configs.in.company":
    "لم يتم العثور على إعدادات تخزين في الشركة الحالية",
  "storage.empty.configs": "لم يتم العثور على إعدادات تخزين",
  "storage.config.load.failed": "فشل تحميل إعدادات التخزين",
  "storage.config.delete.title": "حذف الإعدادات",

  "storage.config.edit.config": "تعديل إعدادات التخزين",
  "storage.config.new.config": "إعدادات جديدة",
  "storage.config.config.name.required": "اسم الإعدادات *",
  "storage.config.config.name.placeholder": "مثل، AWS S3 الإنتاج",
  "storage.config.provider.required": "مزوّد التخزين *",
  "storage.set.as.default": "تعيين كافتراضي",
  "storage.aws.title": "إعدادات AWS S3",
  "storage.config.region.required": "منطقة AWS *",
  "storage.aws.region.placeholder": "us-east-1",
  "storage.config.bucket.required": "اسم الحاوية *",
  "storage.aws.bucket.placeholder": "my-bucket",
  "storage.config.access.key.required": "معرّف مفتاح الوصول *",
  "storage.config.secret.key.required": "مفتاح الوصول السري *",
  "storage.config.endpoint.optional": "نقطة نهاية مخصصة (اختياري)",
  "storage.config.endpoint.placeholder": "https://s3.custom-endpoint.com",
  "storage.azure.title": "إعدادات Azure Blob",
  "storage.azure.account.name.required": "اسم الحساب *",
  "storage.azure.container.name.required": "اسم الحاوية *",
  "storage.azure.account.key.required": "مفتاح الحساب *",
  "storage.sftp.title": "إعدادات SFTP",
  "storage.sftp.host.required": "المضيف *",
  "storage.sftp.host.placeholder": "sftp.example.com",
  "storage.sftp.port.required": "المنفذ *",
  "storage.sftp.port.placeholder": "22",
  "storage.sftp.username.required": "اسم المستخدم *",
  "storage.sftp.password.required": "كلمة المرور *",
  "storage.sftp.base.path.required": "المسار الأساسي *",
  "storage.sftp.base.path.placeholder": "/uploads",
  "storage.local.title": "إعدادات التخزين المحلي",
  "storage.local.base.path.required": "المسار الأساسي *",
  "storage.local.base.path.placeholder": "/var/www/uploads",
  "storage.config.endpoint": "رابط نقطة النهاية",
  "storage.validation.config.name.required": "اسم الإعدادات مطلوب",

  "storage.file.manager.title": "مدير الملفات",
  "storage.button.upload.file": "رفع ملف",
  "storage.table.size": "الحجم",
  "storage.table.location": "الموقع",
  "storage.table.config": "الإعدادات",
  "storage.table.private": "خاص",
  "storage.private": "خاص",
  "storage.public": "عام",
  "storage.tooltip.trash": "المهملات",
  "storage.empty.files.in.company": "لم يتم العثور على ملفات في الشركة الحالية",
  "storage.empty.files": "لم يتم العثور على ملفات",
  "storage.file.url.not.available": "رابط الملف غير متاح",
  "storage.delete.move.to.trash.confirm":
    'نقل "{{name}}" إلى المهملات؟ يمكنك استعادته لاحقاً.',
  "storage.delete.move.to.trash": "نقل إلى المهملات",
  "storage.delete.permanent.delete.confirm":
    'حذف "{{name}}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء وسيحذف الملف من التخزين.',
  "storage.delete.permanent.delete": "حذف نهائي",
  "storage.delete.permanent.delete.button": "حذف نهائي",

  "storage.file.manager.edit.file": "تعديل الملف",
  "storage.file.manager.upload.file": "رفع ملف",
  "storage.config.select.config": "اختر إعدادات التخزين...",
  "storage.config.no.configs":
    "لم يتم العثور على إعدادات تخزين. يرجى إنشاء واحدة أولاً.",
  "storage.folder.optional": "المجلد (اختياري)",
  "storage.folder.no.folder": "لا يوجد مجلد (المستوى الجذر)",
  "storage.folder.no.folders.available":
    "لا توجد مجلدات متاحة. سيتم رفع الملف إلى المستوى الجذر.",
  "storage.folder.no.folders.edit": "لا توجد مجلدات متاحة.",
  "storage.file.select.required": "اختر الملف *",
  "storage.button.choose.file": "اختر ملفاً",
  "storage.upload.drag.drop": "اسحب وأفلت الملف هنا أو انقر للتصفح",
  "storage.upload.max.size": "الحد الأقصى لحجم الملف: {{size}}",
  "storage.upload.please.select": "يرجى اختيار ملف للرفع",
  "storage.file.name.required": "اسم الملف *",
  "storage.file.placeholder.edit": "أدخل اسم الملف",
  "storage.file.placeholder": "سيتم ملؤه تلقائياً من الملف المحدد",
  "storage.file.private": "ملف خاص",
  "storage.file.private.hint": "يمكن الوصول فقط للمستخدمين الحاصلين على إذن",
  "storage.file.public.hint": "الملف متاح للجميع",
  "storage.validation.file.name.required": "اسم الملف مطلوب",
  "storage.error.no.file": "يرجى اختيار ملف",
  "storage.error.no.config": "يرجى اختيار إعدادات تخزين",
  "storage.upload.failed": "فشل رفع الملف",

  "storage.button.new.folder": "مجلد جديد",
  "storage.table.slug": "المعرّف",
  "storage.empty.folders.in.company":
    "لم يتم العثور على مجلدات في الشركة الحالية",
  "storage.empty.folders": "لم يتم العثور على مجلدات",
  "storage.folder.delete.title": "حذف المجلد",

  "storage.folder.edit.folder": "تعديل المجلد",
  "storage.folder.new.folder": "مجلد جديد",
  "storage.folder.name.required": "اسم المجلد *",
  "storage.folder.name.placeholder": "أدخل اسم المجلد",
  "storage.validation.folder.name.required": "اسم المجلد مطلوب",

  "storage.delete.this.item": "هذا العنصر",

  "storage.size.bytes": "بايت",
  "storage.size.gb": "GB",

  "email.config.create.success": "تم إنشاء إعدادات البريد الإلكتروني بنجاح",
  "email.config.create.many.success":
    "تم إنشاء {{count}} إعدادات بريد إلكتروني بنجاح",
  "email.config.get.success": "تم استرجاع إعدادات البريد الإلكتروني بنجاح",
  "email.config.get.all.success": "تم استرجاع إعدادات البريد الإلكتروني بنجاح",
  "email.config.get.by.ids.success":
    "تم استرجاع إعدادات البريد الإلكتروني بالمعرفات بنجاح",
  "email.config.get.by.filter.success":
    "تم استرجاع إعدادات البريد الإلكتروني بالفلتر بنجاح",
  "email.config.update.success": "تم تحديث إعدادات البريد الإلكتروني بنجاح",
  "email.config.update.many.success":
    "تم تحديث {{count}} إعدادات بريد إلكتروني بنجاح",
  "email.config.delete.success": "تم حذف إعدادات البريد الإلكتروني بنجاح",
  "email.config.restore.success": "تم استرجاع إعدادات البريد الإلكتروني بنجاح",

  "email.template.create.success": "تم إنشاء قالب البريد الإلكتروني بنجاح",
  "email.template.update.success": "تم تحديث قالب البريد الإلكتروني بنجاح",
  "email.template.delete.success": "تم حذف قالب البريد الإلكتروني بنجاح",
  "email.template.get.success": "تم استرجاع قالب البريد الإلكتروني بنجاح",
  "email.template.get.by.ids.success":
    "تم استرجاع قوالب البريد الإلكتروني بالمعرفات بنجاح",
  "email.template.get.by.filter.success":
    "تم استرجاع قوالب البريد الإلكتروني بالفلتر بنجاح",
  "email.template.get.all.success": "تم استرجاع قوالب البريد الإلكتروني بنجاح",
  "email.template.create.many.success":
    "تم إنشاء {{count}} قوالب بريد إلكتروني بنجاح",
  "email.template.update.many.success":
    "تم تحديث {{count}} قوالب بريد إلكتروني بنجاح",
  "email.template.restore.success": "تم استرجاع قالب البريد الإلكتروني بنجاح",
  "email.template.not.found": "قالب البريد الإلكتروني غير موجود",

  "email.send.success": "تم إرسال البريد الإلكتروني بنجاح",
  "email.send.failed": "فشل إرسال البريد الإلكتروني",
  "email.send.config.not.found": "إعدادات البريد الإلكتروني غير موجودة",
  "email.send.config.inactive": "إعدادات البريد الإلكتروني غير نشطة",
  "email.send.config.default.not.found":
    "إعدادات البريد الإلكتروني الافتراضية غير موجودة",
  "email.send.template.not.found": "قالب البريد الإلكتروني غير موجود",
  "email.send.template.inactive": "قالب البريد الإلكتروني غير نشط",
  "email.send.template.id.or.slug.required":
    "معرّف القالب أو المعرّف النصي مطلوب",

  "email.template.untitled": "قالب بلا عنوان",
  "email.section.header": "الرأس",
  "email.section.body": "المحتوى",
  "email.section.footer": "التذييل",

  "email.title": "إدارة البريد الإلكتروني",
  "email.subtitle": "إدارة إعدادات البريد الإلكتروني والقوالب",
  "email.template.title": "قوالب البريد الإلكتروني",
  "email.config.title": "إعدادات البريد الإلكتروني",

  "email.config.edit.title": "تعديل إعدادات البريد الإلكتروني",
  "email.config.new.title": "إعدادات بريد إلكتروني جديدة",
  "email.config.name": "اسم الإعدادات",
  "email.config.name.example": "مثل، SMTP الإنتاج",
  "email.config.provider": "المزوّد",
  "email.config.select.provider": "اختر المزوّد",
  "email.config.from.email": "من البريد الإلكتروني",
  "email.config.from.email.example": "noreply@example.com",
  "email.config.from.name": "من الاسم",
  "email.config.from.name.example": "اسم تطبيقك",
  "email.config.set.as.default": "تعيين كافتراضي",
  "email.config.smtp.settings": "إعدادات SMTP",
  "email.config.smtp.host": "مضيف SMTP",
  "email.config.smtp.host.example": "smtp.gmail.com",
  "email.config.port": "المنفذ",
  "email.config.smtp.port.example": "587",
  "email.config.username": "اسم المستخدم",
  "email.config.smtp.user.example": "user@gmail.com",
  "email.config.password": "كلمة المرور",
  "email.config.smtp.password.example": "كلمة مرور التطبيق",
  "email.config.use.ssl.tls": "استخدام SSL/TLS",
  "email.config.sendgrid.settings": "إعدادات SendGrid",
  "email.config.api.key": "مفتاح API",
  "email.config.api.key.example": "مفتاح API",
  "email.config.mailgun.settings": "إعدادات Mailgun",
  "email.config.domain": "النطاق",
  "email.config.domain.example": "mg.example.com",
  "email.config.region": "المنطقة",
  "email.config.select.region": "اختر المنطقة",
  "email.provider.smtp": "SMTP",
  "email.provider.sendgrid": "SendGrid",
  "email.provider.mailgun": "Mailgun",
  "email.region.us": "US",
  "email.region.eu": "EU",

  "email.config.new": "إعدادات جديدة",
  "email.config.empty": "لم يتم العثور على إعدادات بريد إلكتروني",
  "email.config.test.dialog.title": "اختبار إعدادات البريد الإلكتروني",
  "email.config.configuration": "الإعدادات",
  "email.config.recipient.email": "بريد المستلم الإلكتروني",
  "email.recipient.example": "recipient@example.com",
  "email.config.test.dialog.hint":
    "سيتم إرسال بريد إلكتروني اختباري للتحقق من الإعدادات",
  "email.config.send.test": "إرسال اختبار",
  "email.config.enter.recipient": "يرجى إدخال عنوان بريد إلكتروني للمستلم",
  "email.config.delete.title": "حذف الإعدادات",
  "email.config.test": "اختبار الإعدادات",

  "email.template.edit.title": "تعديل قالب البريد الإلكتروني",
  "email.template.new.title": "قالب بريد إلكتروني جديد",
  "email.template.name": "اسم القالب",
  "email.template.name.example": "مثل، بريد الترحيب",
  "email.template.slug": "المعرّف النصي",
  "email.template.slug.example": "مثل، welcome-email",
  "email.template.subject": "الموضوع",
  "email.template.subject.example": "أدخل موضوع البريد الإلكتروني",
  "email.template.variable.hint": "استخدم {{variableName}} للمحتوى الديناميكي",
  "email.template.desc": "الوصف",
  "email.template.desc.placeholder": "وصف موجز للقالب",
  "email.template.content": "المحتوى",
  "email.template.html": "HTML",
  "email.template.plain.text": "نص عادي",
  "email.template.html.placeholder": "أدخل محتوى HTML",
  "email.template.text": "نص",
  "email.template.text.placeholder": "أدخل محتوى النص العادي",
  "email.template.plain.text.hint":
    "يُستخدم النص العادي لعملاء البريد الإلكتروني الذين لا يدعمون HTML",
  "email.template.preview": "معاينة",
  "email.template.live.preview": "معاينة مباشرة",
  "email.template.enter.html.preview": "أدخل محتوى HTML لرؤية المعاينة",
  "email.template.default.content": "أدخل محتوى بريدك الإلكتروني هنا...",

  "email.template.new": "قالب جديد",
  "email.template.test.send": "إرسال بريد اختباري",
  "email.template.empty": "لم يتم العثور على قوالب بريد إلكتروني",
  "email.template.test.dialog.title": "اختبار قالب البريد الإلكتروني",
  "email.template.template": "القالب",
  "email.template.email.config": "إعدادات البريد الإلكتروني",
  "email.template.select.config": "اختر إعدادات",
  "email.template.variables": "متغيرات القالب",
  "email.template.enter.value.for": "أدخل قيمة لـ {{variable}}",
  "email.template.select.config.and.recipient":
    "يرجى اختيار إعدادات بريد إلكتروني وإدخال مستلم",
  "email.template.delete.title": "حذف القالب",

  "form.create.success": "تم إنشاء النموذج بنجاح",
  "form.create.many.success": "تم إنشاء {{count}} نموذج بنجاح",
  "form.get.success": "تم استرجاع النموذج بنجاح",
  "form.get.by.ids.success": "تم استرجاع النماذج بالمعرفات بنجاح",
  "form.get.by.filter.success": "تم استرجاع النماذج بالفلتر بنجاح",
  "form.get.all.success": "تم استرجاع النماذج بنجاح",
  "form.update.success": "تم تحديث النموذج بنجاح",
  "form.update.many.success": "تم تحديث {{count}} نموذج بنجاح",
  "form.delete.success": "تم حذف النموذج بنجاح",
  "form.restore.success": "تم استرجاع النموذج بنجاح",
  "form.not.found": "النموذج غير موجود",
  "form.not.public": "هذا النموذج غير متاح للوصول العام",
  "form.auth.required": "المصادقة مطلوبة لإرسال هذا النموذج",
  "form.access.denied": "ليس لديك إذن للوصول إلى هذا النموذج",
  "form.invalid.access.type": "نوع وصول نموذج غير صالح",
  "form.permission.check.failed":
    "تعذر التحقق من الصلاحيات. يرجى المحاولة مرة أخرى.",
  "form.get.access.info.success": "تم استرجاع معلومات وصول النموذج بنجاح",

  "form.result.create.success": "تم إنشاء نتيجة النموذج بنجاح",
  "form.result.create.many.success": "تم إنشاء {{count}} نتيجة نموذج بنجاح",
  "form.result.get.success": "تم استرجاع نتيجة النموذج بنجاح",
  "form.result.get.by.ids.success": "تم استرجاع نتائج النماذج بالمعرفات بنجاح",
  "form.result.get.by.filter.success": "تم استرجاع نتائج النماذج بالفلتر بنجاح",
  "form.result.get.all.success": "تم استرجاع نتائج النماذج بنجاح",
  "form.result.update.success": "تم تحديث نتيجة النموذج بنجاح",
  "form.result.update.many.success": "تم تحديث {{count}} نتيجة نموذج بنجاح",
  "form.result.delete.success": "تم حذف نتيجة النموذج بنجاح",
  "form.result.restore.success": "تم استرجاع نتيجة النموذج بنجاح",
  "form.result.not.found": "نتيجة النموذج غير موجودة",
  "form.result.has.submitted.success": "قام المستخدم بإرسال هذا النموذج",
  "form.result.has.not.submitted.success": "لم يقم المستخدم بإرسال هذا النموذج",
  "form.result.submit.success": "تم إرسال النموذج بنجاح",
  "form.result.draft.get.success": "تم استرجاع المسودة بنجاح",
  "form.result.draft.update.success": "تم تحديث المسودة بنجاح",

  "form.builder.title": "النماذج",
  "form.builder.create.form": "إنشاء نموذج",
  "form.builder.table.access": "الوصول",
  "form.builder.table.version": "الإصدار",
  "form.builder.details.no.description": "لا يوجد وصف",
  "form.builder.tooltip.view.edit": "عرض/تعديل",
  "form.builder.tooltip.copy.link": "نسخ الرابط",
  "form.builder.tooltip.delete": "حذف",
  "form.builder.toast.copied": "تم النسخ",
  "form.builder.toast.copied.detail": "تم نسخ رابط النموذج إلى الحافظة",
  "form.builder.access.type.public": "عام",
  "form.builder.access.type.authenticated": "مصادق عليه",
  "form.builder.access.type.action.group": "قائم على الصلاحيات",

  "form.builder.untitled.form": "نموذج بلا عنوان",
  "form.builder.action.open.public": "فتح عام",
  "form.builder.tooltip.open.public": "افتح النموذج العام في علامة تبويب جديدة",
  "form.builder.action.copy.link": "نسخ الرابط",
  "form.builder.tooltip.copy.form.link": "نسخ رابط إرسال النموذج",
  "form.builder.tab.builder": "المُنشئ",
  "form.builder.tab.settings": "الإعدادات",
  "form.builder.tab.preview": "المعاينة",
  "form.builder.tab.results": "النتائج",
  "form.builder.details.form.name": "اسم النموذج",
  "form.builder.details.form.name.placeholder": "أدخل اسم النموذج",
  "form.builder.details.form.description.placeholder": "أدخل وصف النموذج",
  "form.builder.details.form.slug": "معرّف النموذج",
  "form.builder.details.form.slug.placeholder": "مثل، customer-feedback",
  "form.builder.details.used.for.public.urls": "يُستخدم لروابط النماذج العامة",
  "form.builder.details.access.type": "نوع الوصول",
  "form.builder.details.select.actions": "اختر الإجراءات",
  "form.builder.details.no.actions.available":
    "لا توجد إجراءات متاحة. قم بتكوين الإجراءات في وحدة IAM أولاً.",
  "form.builder.details.no.actions.empty": "لا توجد إجراءات متاحة",
  "form.builder.details.users.with.access":
    "سيكون لدى المستخدمين بهذه الإجراءات حق الوصول",
  "form.builder.details.selected.permissions": "الصلاحيات المحددة",
  "form.builder.details.action.codes.required":
    "ستكون رموز الإجراءات هذه مطلوبة للوصول إلى النموذج",
  "form.builder.details.required.permissions": "الصلاحيات المطلوبة",
  "form.builder.details.permissions.placeholder":
    "اكتب رمز الصلاحية واضغط Enter",
  "form.builder.details.users.must.have.permission":
    "يجب أن يمتلك المستخدمون إحدى هذه الصلاحيات للإرسال",
  "form.builder.details.response.type": "نوع الاستجابة",
  "form.builder.details.response.mode.single.hint":
    "يمكن لكل مستخدم الإرسال مرة واحدة فقط. للمستخدمين المصادقين، يُفرض هذا بفحص الإرسالات الموجودة. للنماذج العامة، يستخدم هذا تخزين المتصفح.",
  "form.builder.details.response.mode.multiple.hint":
    "يمكن للمستخدمين إرسال استجابات غير محدودة.",
  "form.builder.details.form.is.active": "النموذج نشط",
  "form.builder.details.add.fields.to.preview":
    "أضف حقولاً في علامة تبويب المُنشئ لرؤية المعاينة",
  "form.builder.table.submitted.at": "تاريخ الإرسال",
  "form.builder.table.schema.version": "إصدار المخطط",
  "form.builder.table.source": "المصدر",
  "form.builder.table.source.authenticated": "مصادق عليه",
  "form.builder.table.source.anonymous": "مجهول",
  "form.builder.tooltip.view.response": "عرض الاستجابة",
  "form.builder.details.no.submissions.yet": "لا توجد إرسالات بعد",
  "form.builder.details.access.public": "عام (لا يتطلب مصادقة)",
  "form.builder.details.access.authenticated":
    "مصادق عليه (يتطلب تسجيل الدخول)",
  "form.builder.details.access.permission": "قائم على الصلاحيات",
  "form.builder.details.multiple.responses": "استجابات متعددة",
  "form.builder.details.single.response": "استجابة واحدة",
  "form.builder.toast.validation": "خطأ في التحقق",
  "form.builder.toast.form.name.required": "اسم النموذج مطلوب",
  "form.builder.toast.created": "تم الإنشاء",
  "form.builder.toast.saved": "تم الحفظ",

  "form.builder.public.loading": "جارٍ تحميل النموذج...",
  "form.builder.public.something.went.wrong": "حدث خطأ ما",
  "form.builder.action.go.back": "الرجوع",
  "form.builder.public.access.restricted": "الوصول مقيّد",
  "form.builder.public.access.restricted.description":
    "ليس لديك الصلاحيات المطلوبة لعرض أو إرسال هذا النموذج. يرجى الاتصال بالمسؤول إذا كنت تعتقد أن هذا خطأ.",
  "form.builder.public.login.required": "يتطلب هذا النموذج تسجيل الدخول.",
  "form.builder.public.permission.required":
    "يتطلب هذا النموذج صلاحيات محددة. يرجى تسجيل الدخول للمتابعة.",
  "form.builder.action.login.to.continue": "تسجيل الدخول للمتابعة",
  "form.builder.public.continue.your.draft": "متابعة مسودتك؟",
  "form.builder.public.draft.saved.description":
    "لديك مسودة محفوظة لهذا النموذج. هل تريد المتابعة من حيث توقفت؟",
  "form.builder.public.schema.change.warning":
    "ملاحظة: تم تحديث النموذج منذ حفظ مسودتك. قد تكون بعض الحقول قد تغيّرت.",
  "form.builder.action.continue.draft": "متابعة المسودة",
  "form.builder.action.start.fresh": "البدء من جديد",
  "form.builder.public.thank.you": "شكراً لك!",
  "form.builder.public.response.recorded.success": "تم تسجيل استجابتك بنجاح.",
  "form.builder.action.submit.another": "إرسال استجابة أخرى",
  "form.builder.public.already.submitted": "تم الإرسال بالفعل",
  "form.builder.public.already.submitted.description":
    "لقد أرسلت بالفعل استجابة لهذا النموذج.",
  "form.builder.public.single.submission.note":
    "يسمح هذا النموذج بإرسال واحد فقط لكل مستخدم.",
  "form.builder.error.form.id.required": "معرّف النموذج مطلوب",
  "form.builder.error.form.not.available": "هذا النموذج غير موجود أو غير متاح.",
  "form.builder.error.form.inactive": "هذا النموذج غير نشط حالياً.",
  "form.builder.error.invalid.configuration": "إعدادات نموذج غير صالحة.",
  "form.builder.error.not.public": "هذا النموذج غير متاح للوصول العام.",
  "form.builder.error.load.failed": "فشل تحميل النموذج.",
  "form.builder.toast.submitted": "تم الإرسال",
  "form.builder.toast.draft.saved": "تم حفظ المسودة",
  "form.builder.toast.draft.saved.detail": "تم حفظ تقدمك محلياً",
  "form.builder.toast.draft.not.saved": "لم يتم حفظ المسودة",
  "form.builder.toast.draft.not.saved.detail":
    "تعذر حفظ المسودة. قد يكون متصفحك في وضع التصفح الخاص أو التخزين ممتلئ.",
  "form.builder.public.powered.by": "مدعوم بواسطة مُنشئ نماذج {{appName}}",

  "form.builder.result.form.submission": "إرسال النموذج",
  "form.builder.action.download.pdf": "تنزيل PDF",
  "form.builder.action.download.json": "تنزيل JSON",
  "form.builder.result.error.loading.submission": "خطأ في تحميل الإرسال",
  "form.builder.error.load.submission.failed": "فشل تحميل الإرسال",
  "form.builder.error.result.id.required": "معرّف النتيجة مطلوب",
  "form.builder.toast.downloaded": "تم التنزيل",
  "form.builder.toast.downloaded.pdf.detail": "تم تنزيل PDF",
  "form.builder.toast.downloaded.json.detail": "تم تنزيل JSON",
  "form.builder.result.version.notice":
    "تم هذا الإرسال بإصدار النموذج v{{submissionVersion}}. إصدار النموذج الحالي v{{currentVersion}}.",

  "form.builder.tooltip.unsaved.changes": "تغييرات غير محفوظة",
  "form.builder.tooltip.toggle.layout":
    "التبديل بين التخطيط القائم على الأقسام والتخطيط المسطح",
  "form.builder.toolbar.flat": "مسطح",
  "form.builder.toolbar.sections": "أقسام",
  "form.builder.toolbar.section": "قسم",
  "form.builder.toolbar.field": "حقل",
  "form.builder.toolbar.fields": "حقول",
  "form.builder.action.import": "استيراد",
  "form.builder.tooltip.import.schema": "استيراد مخطط النموذج",
  "form.builder.action.export": "تصدير",
  "form.builder.tooltip.export.schema": "تصدير مخطط النموذج",

  "form.builder.field.types": "أنواع الحقول",
  "form.builder.search.fields.placeholder": "البحث في الحقول...",
  "form.builder.input.fields": "حقول الإدخال",
  "form.builder.selection.fields": "حقول الاختيار",
  "form.builder.specialized.fields": "حقول متخصصة",
  "form.builder.no.fields.match": 'لا توجد حقول تطابق "{{query}}"',
  "form.builder.field.text": "حقل نصي",
  "form.builder.field.textarea": "منطقة نص",
  "form.builder.field.number": "حقل رقم",
  "form.builder.field.email": "حقل بريد إلكتروني",
  "form.builder.field.phone": "هاتف",
  "form.builder.field.checkbox": "مربع اختيار",
  "form.builder.field.radio": "مجموعة راديو",
  "form.builder.field.date": "منتقي التاريخ",
  "form.builder.field.time": "الوقت",
  "form.builder.field.datetime": "التاريخ والوقت",
  "form.builder.field.dropdown": "قائمة منسدلة",
  "form.builder.field.multi.select": "اختيار متعدد",
  "form.builder.field.file": "رفع ملف",
  "form.builder.field.file.upload": "رفع ملف",
  "form.builder.field.image": "رفع صورة",
  "form.builder.field.signature": "توقيع",
  "form.builder.field.rating": "تقييم",
  "form.builder.field.slider": "شريط تمرير",
  "form.builder.field.likert": "مقياس ليكرت",
  "form.builder.field.unknown": "نوع حقل غير معروف",

  "form.builder.section.settings": "إعدادات القسم",
  "form.builder.tab.general": "عام",
  "form.builder.tab.validation": "التحقق",
  "form.builder.tab.options": "الخيارات",
  "form.builder.tab.logic": "المنطق",
  "form.builder.field.label": "التسمية",
  "form.builder.field.label.placeholder": "أدخل تسمية الحقل",
  "form.builder.field.field.name": "اسم الحقل",
  "form.builder.field.name.placeholder": "مثل، first_name",
  "form.builder.field.name.hint":
    "يُستخدم كمفتاح في بيانات الإرسال. يجب أن يكون فريداً في النموذج.",
  "form.builder.field.placeholder": "العنصر النائب",
  "form.builder.placeholder.text": "أدخل نص العنصر النائب",
  "form.builder.field.help.text": "نص المساعدة",
  "form.builder.help.text.placeholder": "أدخل نص المساعدة",
  "form.builder.label.width": "العرض",
  "form.builder.field.required": "مطلوب",
  "form.builder.field.visible": "مرئي",
  "form.builder.rating.settings": "إعدادات التقييم",
  "form.builder.rating.number.of.stars": "عدد النجوم",
  "form.builder.rating.min.label": "التسمية الدنيا",
  "form.builder.rating.min.example": "مثل، غير محتمل",
  "form.builder.rating.max.label": "التسمية القصوى",
  "form.builder.rating.max.example": "مثل، محتمل جداً",
  "form.builder.section.name": "اسم القسم",
  "form.builder.section.name.placeholder": "أدخل اسم القسم",
  "form.builder.section.description": "الوصف",
  "form.builder.section.desc.placeholder": "أدخل وصف القسم",
  "form.builder.section.collapsible": "قابل للطي",
  "form.builder.section.initially.collapsed": "مطوي في البداية",
  "form.builder.section.layout": "التخطيط",
  "form.builder.layout.grid.columns": "أعمدة الشبكة",
  "form.builder.layout.grid.columns.hint":
    "عدد الأعمدة في تخطيط الشبكة لهذا القسم.",
  "form.builder.layout.field.gap": "فراغ الحقل",
  "form.builder.layout.field.gap.hint": "التباعد بين الحقول في الشبكة.",
  "form.builder.validation.min.length.label": "الحد الأدنى للطول",
  "form.builder.validation.max.length.label": "الحد الأقصى للطول",
  "form.builder.email.pattern": "نمط البريد الإلكتروني",
  "form.builder.email.pattern.placeholder": "مثل، @gmail\\.com$",
  "form.builder.email.pattern.hint":
    "تعبير نمطي لتقييد نطاقات البريد الإلكتروني المقبولة.",
  "form.builder.email.example.gmail": "عناوين Gmail فقط",
  "form.builder.email.example.domains": "نطاقات متعددة",
  "form.builder.email.pattern.message": "رسالة خطأ النمط",
  "form.builder.email.pattern.message.placeholder":
    "مثل، يُقبل فقط البريد الإلكتروني للشركة",
  "form.builder.email.pattern.message.hint":
    "تظهر عندما لا يطابق البريد الإلكتروني النمط.",
  "form.builder.validation.min.value": "القيمة الدنيا",
  "form.builder.validation.max.value": "القيمة القصوى",
  "form.builder.validation.step": "الخطوة",
  "form.builder.validation.max.selections": "الحد الأقصى للتحديدات",
  "form.builder.validation.unlimited.hint":
    "اترك فارغاً للتحديدات غير المحدودة.",
  "form.builder.validation.max.files": "الحد الأقصى للملفات",
  "form.builder.validation.max.file.size": "الحد الأقصى لحجم الملف (بايت)",
  "form.builder.validation.no.options":
    "لم تتم إضافة خيارات. أضف خياراً واحداً على الأقل.",
  "form.builder.likert.scale.labels": "تسميات المقياس",
  "form.builder.likert.option.number": "خيار {{index}}",
  "form.builder.tooltip.remove.column": "إزالة العمود",
  "form.builder.likert.add.column": "إضافة عمود",
  "form.builder.likert.statements": "البيانات (صفوف)",
  "form.builder.likert.statement.number": "بيان {{index}}",
  "form.builder.likert.add.statement": "إضافة بيان",
  "form.builder.tooltip.remove.statement": "إزالة البيان",
  "form.builder.option.label.placeholder": "أدخل تسمية الخيار",
  "form.builder.tooltip.remove.option": "إزالة الخيار",
  "form.builder.options.add.option": "إضافة خيار",
  "form.builder.section.visibility": "رؤية القسم",
  "form.builder.section.visibility.hint":
    "التحكم في متى يظهر هذا القسم بناءً على قيم الحقول.",
  "form.builder.logic.conditional.rules": "القواعد الشرطية",
  "form.builder.logic.conditional.rules.hint":
    "أضف قواعد للتحكم في الرؤية أو المتطلبات بناءً على قيم الحقول الأخرى.",
  "form.builder.logic.rule.number": "قاعدة",
  "form.builder.tooltip.remove.rule": "إزالة القاعدة",
  "form.builder.logic.no.rules": "لا توجد قواعد شرطية محددة.",
  "form.builder.logic.add.rule": "إضافة قاعدة",
  "form.builder.width.auto": "تلقائي",
  "form.builder.width.full": "عرض كامل",
  "form.builder.width.half": "نصف العرض",
  "form.builder.width.third": "ثلث",
  "form.builder.width.quarter": "ربع",
  "form.builder.layout.column1": "عمود واحد",
  "form.builder.layout.column2": "عمودان",
  "form.builder.layout.column3": "٣ أعمدة",
  "form.builder.layout.column4": "٤ أعمدة",
  "form.builder.layout.gap.small": "صغير (0.5rem)",
  "form.builder.layout.gap.medium": "متوسط (1rem)",
  "form.builder.layout.gap.large": "كبير (1.5rem)",
  "form.builder.layout.gap.x.large": "كبير جداً (2rem)",

  "form.builder.logic.add.conditional.logic":
    "أضف منطقاً شرطياً للتحكم في متى يُعرض هذا الحقل أو يكون مطلوباً.",
  "form.builder.action.add.logic": "إضافة منطق",
  "form.builder.logic.action.label": "إجراء",
  "form.builder.logic.select.action.placeholder": "اختر إجراءً",
  "form.builder.logic.select.target": "اختر الهدف",
  "form.builder.logic.when": "عندما:",
  "form.builder.logic.of.following.conditions": "من الشروط التالية صحيح",
  "form.builder.logic.select.field": "اختر حقلاً",
  "form.builder.logic.select.comparison": "اختر المقارنة",
  "form.builder.logic.value.placeholder": "القيمة",
  "form.builder.logic.select.date": "اختر التاريخ",
  "form.builder.logic.select.value": "اختر القيمة",
  "form.builder.logic.select.values": "اختر القيم",
  "form.builder.logic.remove.condition.tooltip": "إزالة الشرط",
  "form.builder.action.add.condition": "إضافة شرط",
  "form.builder.action.remove.logic": "إزالة المنطق",
  "form.builder.logic.any": "أي",
  "form.builder.logic.hide.section": "إخفاء القسم",
  "form.builder.logic.hide.field": "إخفاء الحقل",
  "form.builder.logic.make.required": "جعله مطلوباً",
  "form.builder.logic.jump.to.section": "الانتقال إلى القسم",
  "form.builder.logic.target": "الهدف",

  "form.builder.computed.computed.fields": "الحقول المحسوبة",
  "form.builder.computed.define.fields":
    "حدد الحقول التي يتم حسابها من استجابات النموذج عند الإرسال",
  "form.builder.action.add.computed.field": "إضافة حقل محسوب",
  "form.builder.computed.no.computed.fields": "لا توجد حقول محسوبة محددة",
  "form.builder.computed.click.to.create":
    'انقر على "إضافة حقل محسوب" لإنشاء واحد',
  "form.builder.computed.unnamed.field": "حقل بلا اسم",
  "form.builder.computed.name": "الاسم",
  "form.builder.computed.name.placeholder": "مثل، المجموع الكلي",
  "form.builder.computed.key": "المفتاح",
  "form.builder.computed.key.placeholder": "مثل، total_score",
  "form.builder.computed.used.in.submission.data": "يُستخدم في بيانات الإرسال",
  "form.builder.computed.value.type": "نوع القيمة",
  "form.builder.computed.default.value.label":
    "القيمة الافتراضية (إذا لم تتطابق أي قاعدة)",
  "form.builder.computed.default.number": "أدخل الرقم الافتراضي",
  "form.builder.computed.default.value": "أدخل القيمة الافتراضية",
  "form.builder.computed.computation.rules": "قواعد الحساب",
  "form.builder.action.add.rule": "إضافة قاعدة",
  "form.builder.computed.rules.evaluation.order":
    "يتم تقييم القواعد بالترتيب. تُطبّق أول قاعدة مطابقة.",
  "form.builder.computed.no.rules.defined":
    "لا توجد قواعد محددة. أضف قاعدة لتكوين الحساب.",
  "form.builder.computed.rule.number": "قاعدة {{number}}",
  "form.builder.tooltip.move.up": "نقل للأعلى",
  "form.builder.tooltip.move.down": "نقل للأسفل",
  "form.builder.tooltip.delete.rule": "حذف القاعدة",
  "form.builder.computed.condition.optional": "الشرط (اختياري)",
  "form.builder.action.remove.condition": "إزالة الشرط",
  "form.builder.computed.of.the.following": "من التالي:",
  "form.builder.logic.enter.value": "أدخل القيمة",
  "form.builder.computed.no.condition.always":
    "لا شرط = يُطبّق دائماً (إذا تم الوصول)",
  "form.builder.computed.then.set.value.to": "ثم عيّن القيمة إلى:",
  "form.builder.logic.select.operation": "اختر العملية",
  "form.builder.computed.add.operand": "إضافة معامل",
  "form.builder.computed.delete.computed.field": "حذف الحقل المحسوب",
  "form.builder.computed.value.type.number": "رقم",
  "form.builder.computed.value.type.text": "نص",
  "form.builder.computed.computation.type.direct": "قيمة مباشرة",
  "form.builder.computed.computation.type.field.reference": "مرجع حقل",
  "form.builder.computed.computation.type.arithmetic": "حسابي",
  "form.builder.computed.arithmetic.sum": "مجموع",
  "form.builder.computed.arithmetic.subtract": "طرح",
  "form.builder.computed.arithmetic.multiply": "ضرب",
  "form.builder.computed.arithmetic.divide": "قسمة",
  "form.builder.computed.arithmetic.average": "متوسط",
  "form.builder.computed.arithmetic.min": "الحد الأدنى",
  "form.builder.computed.arithmetic.max": "الحد الأقصى",
  "form.builder.computed.arithmetic.increment": "زيادة",
  "form.builder.computed.arithmetic.decrement": "نقصان",
  "form.builder.computed.operand.type.field": "حقل",
  "form.builder.computed.operand.type.value": "قيمة",

  "form.builder.operator.is.empty": "فارغ",
  "form.builder.operator.is.not.empty": "ليس فارغاً",
  "form.builder.operator.is": "هو",
  "form.builder.operator.is.not": "ليس",
  "form.builder.operator.contains": "يحتوي على",
  "form.builder.operator.not.contains": "لا يحتوي على",
  "form.builder.operator.starts.with": "يبدأ بـ",
  "form.builder.operator.ends.with": "ينتهي بـ",
  "form.builder.operator.equals": "يساوي",
  "form.builder.operator.not.equals": "لا يساوي",
  "form.builder.operator.greater.than": "أكبر من",
  "form.builder.operator.less.than": "أصغر من",
  "form.builder.operator.greater.or.equal": "أكبر من أو يساوي",
  "form.builder.operator.less.or.equal": "أصغر من أو يساوي",
  "form.builder.operator.is.before": "قبل",
  "form.builder.operator.is.after": "بعد",
  "form.builder.operator.is.checked": "محدد",
  "form.builder.operator.is.not.checked": "غير محدد",
  "form.builder.operator.is.any.of": "أي من",
  "form.builder.operator.is.none.of": "لا شيء من",
  "form.builder.operator.contains.any.of": "يحتوي على أي من",
  "form.builder.operator.contains.none.of": "لا يحتوي على أي من",
  "form.builder.operator.row.value.equals": "قيمة الصف تساوي",
  "form.builder.operator.row.value.not.equals": "قيمة الصف لا تساوي",
  "form.builder.operator.has.files": "يحتوي على ملفات",
  "form.builder.operator.has.no.files": "لا يحتوي على ملفات",
  "form.builder.logic.action.hide.when": "إخفاء عندما...",
  "form.builder.logic.action.require.when": "مطلوب عندما...",
  "form.builder.logic.action.hide.field.when": "إخفاء الحقل عندما...",
  "form.builder.logic.action.make.field.required.when":
    "جعل الحقل مطلوباً عندما...",
  "form.builder.logic.action.jump.to.section.when":
    "الانتقال إلى القسم عندما...",
  "form.builder.logic.action.hide.section.when": "إخفاء القسم عندما...",
  "form.builder.logic.action.hide.this.section.when":
    "إخفاء هذا القسم عندما...",

  "form.builder.section.no.sections": "لا توجد أقسام بعد",
  "form.builder.section.start.by.adding": "ابدأ بإضافة قسم",
  "form.builder.section.add": "إضافة قسم",
  "form.builder.new.section": "قسم جديد",

  "form.builder.tooltip.conditional.visibility": "قواعد الرؤية الشرطية نشطة",
  "form.builder.tooltip.duplicate.section": "تكرار القسم",
  "form.builder.tooltip.delete.section": "حذف القسم",
  "form.builder.section.drag.fields.here": "اسحب الحقول هنا",

  "form.builder.layout.responsive": "تخطيط متجاوب",
  "form.builder.layout.enable.responsive": "تمكين التخطيط المتجاوب",
  "form.builder.layout.responsive.hint":
    "ضبط الأعمدة تلقائياً بناءً على حجم الشاشة.",
  "form.builder.layout.mobile": "الجوال",
  "form.builder.layout.tablet": "جهاز لوحي",
  "form.builder.layout.desktop": "سطح المكتب",
  "form.builder.layout.large": "كبير",
  "form.builder.layout.xl": "كبير جداً",

  "form.builder.layout.form.layout": "تخطيط النموذج",
  "form.builder.layout.click.form.fields":
    'انقر على "حقول النموذج" لتعديل إعدادات التخطيط',
  "form.builder.layout.select.field.to.edit": "أو اختر حقلاً لتعديل خصائصه",
  "form.builder.layout.select.to.edit": "اختر حقلاً أو قسماً لتعديل خصائصه",
  "form.builder.toast.import.failed": "فشل الاستيراد",
  "form.builder.toast.import.failed.detail": "تنسيق ملف JSON غير صالح",

  "form.builder.section.default": "قسم",
  "form.builder.likert.strongly.disagree": "لا أوافق بشدة",
  "form.builder.likert.disagree": "لا أوافق",
  "form.builder.likert.neutral": "محايد",
  "form.builder.likert.agree": "أوافق",
  "form.builder.likert.strongly.agree": "أوافق بشدة",
  "form.builder.defaults.option1": "خيار ١",
  "form.builder.defaults.option2": "خيار ٢",
  "form.builder.defaults.statement1": "بيان ١",
  "form.builder.defaults.statement2": "بيان ٢",

  "form.builder.result.submitted": "تم الإرسال",
  "form.builder.result.version": "الإصدار",
  "form.builder.result.fields.answered":
    "{{answered}} / {{total}} حقل تم الإجابة عليه",
  "form.builder.result.computed.title": "النتائج المحسوبة",
  "form.builder.result.computed.subtitle":
    "محسوبة تلقائياً بناءً على استجاباتك",
  "form.builder.status.draft": "مسودة",
  "form.builder.status.completed": "مكتمل",

  "form.builder.result.no.selection": "لا يوجد تحديد",
  "form.builder.result.no.responses": "لا توجد استجابات",
  "form.builder.result.no.rating": "لا يوجد تقييم",
  "form.builder.result.no.file.uploaded": "لم يتم رفع ملف",
  "form.builder.result.no.answer": "لا توجد إجابة",

  "form.builder.validation.required": "{{label}} مطلوب",
  "form.builder.validation.email": "يرجى إدخال عنوان بريد إلكتروني صالح",
  "form.builder.validation.must.match.format":
    "يجب أن يطابق {{label}} التنسيق المطلوب",
  "form.builder.validation.min.length":
    "يجب أن يكون {{label}} {{value}} حرف على الأقل",
  "form.builder.validation.max.length":
    "يجب أن يكون {{label}} {{value}} حرف على الأكثر",
  "form.builder.validation.min": "يجب أن يكون {{label}} {{value}} على الأقل",
  "form.builder.validation.max": "يجب أن يكون {{label}} {{value}} على الأكثر",
  "form.builder.validation.pattern": "تنسيق {{label}} غير صالح",
  "form.builder.validation.invalid": "{{label}} غير صالح",

  "form.builder.schema.invalid": "مخطط غير صالح",
  "form.builder.schema.invalid.json": "تنسيق JSON غير صالح",
  "form.builder.schema.browser.only": "هذه الميزة متاحة فقط في المتصفح",
  "form.builder.schema.read.failed": "فشل قراءة الملف",
  "form.builder.validation.schema.must.be.object": "يجب أن يكون المخطط كائناً",
  "form.builder.validation.schema.id.required":
    "يجب أن يحتوي المخطط على معرّف نصي",
  "form.builder.validation.schema.name.required":
    "يجب أن يحتوي المخطط على اسم نصي",
  "form.builder.validation.schema.sections.required":
    "يجب أن يحتوي المخطط على مصفوفة أقسام",
  "form.builder.validation.section.must.be.object": "يجب أن يكون القسم كائناً",
  "form.builder.validation.section.id.required":
    "يجب أن يحتوي القسم على معرّف نصي",
  "form.builder.validation.section.name.required":
    "يجب أن يحتوي القسم على اسم نصي",
  "form.builder.validation.section.fields.required":
    "يجب أن يحتوي القسم على مصفوفة حقول",
  "form.builder.validation.section.invalid.layout": "نوع تخطيط غير صالح",
  "form.builder.validation.field.must.be.object": "يجب أن يكون الحقل كائناً",
  "form.builder.validation.field.id.required":
    "يجب أن يحتوي الحقل على معرّف نصي",
  "form.builder.validation.field.invalid.type": "نوع حقل غير صالح",
  "form.builder.validation.field.label.required":
    "يجب أن يحتوي الحقل على تسمية نصية",
  "form.builder.validation.field.options.required":
    "يجب أن يحتوي حقل الاختيار على مصفوفة خيارات",

  "form.builder.pdf.browser.only": "تصدير PDF متاح فقط في المتصفح",
  "form.builder.pdf.stats.sections": "الأقسام",
  "form.builder.pdf.stats.total.fields": "إجمالي الحقول",
  "form.builder.pdf.stats.answered": "تم الإجابة",
  "form.builder.pdf.stats.complete": "مكتمل",
  "form.builder.pdf.footer": "تم الإنشاء بواسطة مُنشئ النماذج",
  "form.builder.pdf.table.question": "السؤال",
  "form.builder.pdf.table.response": "الاستجابة",
  "form.builder.pdf.no.fields.in.section": "لا توجد حقول في هذا القسم",
  "form.builder.pdf.table.computed.field": "حقل محسوب",
  "form.builder.pdf.table.result": "النتيجة",

  "form.builder.action.submit": "إرسال",
  "form.builder.action.save.draft": "حفظ المسودة",
  "form.builder.action.next": "التالي",

  "form.builder.field.form.fields": "حقول النموذج",
  "form.builder.field.drag.from.palette": "اسحب الحقول من اللوحة",
  "form.builder.field.no.fields": "لا توجد حقول",
  "form.builder.field.drag.from.left.panel": "اسحب الحقول من اللوحة اليسرى",

  "form.builder.tooltip.duplicate": "تكرار",

  "event.create.success": "تم إنشاء الحدث بنجاح",
  "event.create.many.success": "تم إنشاء {{count}} حدث بنجاح",
  "event.get.success": "تم استرجاع الحدث بنجاح",
  "event.get.by.ids.success": "تم استرجاع الأحداث بالمعرفات بنجاح",
  "event.get.by.filter.success": "تم استرجاع الأحداث بالفلتر بنجاح",
  "event.get.all.success": "تم استرجاع الأحداث بنجاح",
  "event.update.success": "تم تحديث الحدث بنجاح",
  "event.update.many.success": "تم تحديث {{count}} حدث بنجاح",
  "event.delete.success": "تم حذف الحدث بنجاح",
  "event.restore.success": "تم استرجاع الحدث بنجاح",
  "event.not.found": "الحدث غير موجود",

  "event.participant.not.found": "المشارك غير موجود",
  "event.participant.status.update.success": "تم تحديث حالة المشارك بنجاح",

  "event.manager.my.events": "أحداثي",
  "event.manager.all.events": "جميع الأحداث",
  "event.manager.recurrence.none": "لا شيء",
  "event.manager.recurrence.daily": "يومي",
  "event.manager.recurrence.weekly": "أسبوعي",
  "event.manager.recurrence.biweekly": "كل أسبوعين",
  "event.manager.recurrence.monthly": "شهري",

  "event.manager.title": "مدير الأحداث",
  "event.manager.subtitle": "إدارة الأحداث والاجتماعات والجداول",
  "event.manager.tabs.calendar": "التقويم",
  "event.manager.tabs.event.list": "قائمة الأحداث",

  "event.manager.calendar.title": "التقويم",
  "event.manager.event.saved.success": 'تم حفظ الحدث "{{title}}" بنجاح.',

  "event.manager.event.list.title": "قائمة الأحداث",
  "event.manager.new.event": "حدث جديد",
  "event.manager.table.title": "العنوان",
  "event.manager.table.start": "البداية",
  "event.manager.table.end": "النهاية",
  "event.manager.recurrence": "التكرار",
  "event.manager.table.participants": "المشاركون",
  "event.manager.participants": "مشارك(ين)",
  "event.manager.no.events.in.company":
    "لم يتم العثور على أحداث في الشركة الحالية",
  "event.manager.no.events": "لم يتم العثور على أحداث",

  "event.manager.form.title.required": "العنوان *",
  "event.manager.placeholder.title": "أدخل عنوان الحدث",
  "event.manager.form.description": "الوصف",
  "event.manager.placeholder.description": "أدخل الوصف (اختياري)",
  "event.manager.form.date.required": "التاريخ مطلوب",
  "event.manager.placeholder.event.date": "اختر تاريخ الحدث",
  "event.manager.form.all.day.event": "حدث طوال اليوم",
  "event.manager.form.start.time.required": "وقت البداية مطلوب",
  "event.manager.form.end.time.required": "وقت النهاية مطلوب",
  "event.manager.placeholder.recurrence": "اختر التكرار",
  "event.manager.form.repeat.on": "تكرار في",
  "event.manager.form.recurrence.end": "نهاية التكرار (اختياري)",
  "event.manager.placeholder.recurrence.end":
    "اترك فارغاً لعدم وجود تاريخ نهاية",
  "event.manager.form.recurrence.end.hint": "اترك فارغاً للتكرار إلى الأبد",
  "event.manager.form.meeting.link": "رابط الاجتماع",
  "event.manager.placeholder.meeting.link":
    "https://meet.google.com/... (اختياري)",
  "event.manager.form.color": "اللون",
  "event.manager.form.participants": "المشاركون",
  "event.manager.placeholder.participants": "اختر المشاركين...",
  "event.manager.weekday.su": "أحد",
  "event.manager.weekday.mo": "اثن",
  "event.manager.weekday.tu": "ثلا",
  "event.manager.weekday.we": "أرب",
  "event.manager.weekday.th": "خمي",
  "event.manager.weekday.fr": "جمع",
  "event.manager.weekday.sa": "سبت",
  "event.manager.dialog.edit.event": "تعديل الحدث",
  "event.manager.dialog.new.event": "حدث جديد",

  "event.manager.today": "اليوم",
  "event.manager.view.month": "شهر",
  "event.manager.view.week": "أسبوع",
  "event.manager.view.day": "يوم",

  "event.manager.all.day": "طوال اليوم",
  "event.manager.join": "انضمام",

  "event.manager.more.events": "+{{count}} المزيد",
  "event.manager.weekday.sun": "أحد",
  "event.manager.weekday.mon": "اثنين",
  "event.manager.weekday.tue": "ثلاثاء",
  "event.manager.weekday.wed": "أربعاء",
  "event.manager.weekday.thu": "خميس",
  "event.manager.weekday.fri": "جمعة",
  "event.manager.weekday.sat": "سبت",

  "event.manager.all.day.parens": "(طوال اليوم)",
  "event.manager.time.to": "إلى",

  "event.manager.delete.this.item": "هذا العنصر",

  "notification.create.success": "تم إنشاء الإشعار بنجاح",
  "notification.create.many.success": "تم إنشاء {{count}} إشعار بنجاح",
  "notification.get.success": "تم استرجاع الإشعار بنجاح",
  "notification.get.by.ids.success": "تم استرجاع الإشعارات بالمعرفات بنجاح",
  "notification.get.by.filter.success": "تم استرجاع الإشعارات بالفلتر بنجاح",
  "notification.get.all.success": "تم استرجاع الإشعارات بنجاح",
  "notification.update.success": "تم تحديث الإشعار بنجاح",
  "notification.update.many.success": "تم تحديث {{count}} إشعار بنجاح",
  "notification.delete.success": "تم حذف الإشعار بنجاح",
  "notification.restore.success": "تم استرجاع الإشعار بنجاح",
  "notification.not.found": "الإشعار غير موجود",
  "notification.mark.read.success": "تم تعليم الإشعار كمقروء",
  "notification.mark.all.read.success": "تم تعليم {{count}} إشعار كمقروء",
  "notification.unread.count.success": "تم استرجاع عدد غير المقروءة",
  "notification.send.success": "تم إرسال الإشعار بنجاح",
  "notification.broadcast.success": "تم إرسال {{count}} إشعار بنجاح",

  "notification.empty.title": "لا توجد إشعارات بعد",
  "notification.empty.subtitle": "أنت على اطلاع بكل شيء!",

  "language.create.success": "تم إنشاء اللغة بنجاح",
  "language.create.many.success": "تم إنشاء {{count}} لغة بنجاح",
  "language.get.success": "تم استرجاع اللغة بنجاح",
  "language.get.by.ids.success": "تم استرجاع اللغات بالمعرفات بنجاح",
  "language.get.by.filter.success": "تم استرجاع اللغات بالفلتر بنجاح",
  "language.get.all.success": "تم استرجاع اللغات بنجاح",
  "language.update.success": "تم تحديث اللغة بنجاح",
  "language.update.many.success": "تم تحديث {{count}} لغة بنجاح",
  "language.delete.success": "تم حذف اللغة بنجاح",
  "language.restore.success": "تم استرجاع اللغة بنجاح",
  "language.active.success": "تم استرجاع اللغات النشطة بنجاح",
  "language.set.default.success": "تم تحديث اللغة الافتراضية بنجاح",
  "language.get.default.success": "تم استرجاع اللغة الافتراضية بنجاح",

  "translation.key.create.success": "تم إنشاء مفتاح الترجمة بنجاح",
  "translation.key.create.many.success": "تم إنشاء {{count}} مفتاح ترجمة بنجاح",
  "translation.key.get.success": "تم استرجاع مفتاح الترجمة بنجاح",
  "translation.key.get.by.ids.success":
    "تم استرجاع مفاتيح الترجمة بالمعرفات بنجاح",
  "translation.key.get.by.filter.success":
    "تم استرجاع مفاتيح الترجمة بالفلتر بنجاح",
  "translation.key.get.all.success": "تم استرجاع مفاتيح الترجمة بنجاح",
  "translation.key.update.success": "تم تحديث مفتاح الترجمة بنجاح",
  "translation.key.update.many.success": "تم تحديث {{count}} مفتاح ترجمة بنجاح",
  "translation.key.delete.success": "تم حذف مفتاح الترجمة بنجاح",
  "translation.key.restore.success": "تم استرجاع مفتاح الترجمة بنجاح",
  "translation.key.modules.success": "تم استرجاع الوحدات بنجاح",
  "translation.key.readonly.delete.forbidden":
    "لا يمكن حذف مفاتيح الترجمة للقراءة فقط: {{keys}}",
  "translation.key.readonly.update.forbidden":
    "لا يمكن تعديل المفتاح أو الوحدة لمفاتيح ترجمة النظام",
  "translation.key.duplicate.key.in.module":
    'مفتاح الترجمة "{{key}}" موجود بالفعل في الوحدة "{{module}}"',

  "translation.create.success": "تم إنشاء الترجمة بنجاح",
  "translation.create.many.success": "تم إنشاء {{count}} ترجمة بنجاح",
  "translation.get.success": "تم استرجاع الترجمة بنجاح",
  "translation.get.by.ids.success": "تم استرجاع الترجمات بالمعرفات بنجاح",
  "translation.get.by.filter.success": "تم استرجاع الترجمات بالفلتر بنجاح",
  "translation.get.all.success": "تم استرجاع الترجمات بنجاح",
  "translation.update.success": "تم تحديث الترجمة بنجاح",
  "translation.update.many.success": "تم تحديث {{count}} ترجمة بنجاح",
  "translation.delete.success": "تم حذف الترجمة بنجاح",
  "translation.restore.success": "تم استرجاع الترجمة بنجاح",
  "translation.by.language.success": "تم استرجاع الترجمات بنجاح",

  "localization.title": "الترجمة",
  "localization.subtitle": "إدارة اللغات والترجمات",
  "localization.tabs.languages": "اللغات",
  "localization.tabs.keys": "المفاتيح",

  "localization.language.title": "اللغات",
  "localization.language.subtitle": "إدارة اللغات المتاحة لتطبيقك",
  "localization.language.new": "إضافة لغة",
  "localization.language.code": "رمز اللغة",
  "localization.language.name": "اسم اللغة",
  "localization.language.native.name": "الاسم الأصلي",
  "localization.language.direction": "اتجاه النص",
  "localization.language.rtl": "من اليمين لليسار",
  "localization.language.ltr": "من اليسار لليمين",
  "localization.language.default": "افتراضي",
  "localization.language.set.default": "تعيين كافتراضي",
  "localization.language.empty": "لا توجد لغات مُعدّة. أضف لغة للبدء.",
  "localization.language.confirm.set.default":
    'تعيين "{{name}}" كاللغة الافتراضية؟',
  "localization.language.delete.title": "حذف اللغة",

  "localization.language.edit": "تعديل اللغة",
  "localization.placeholder.code": "en",
  "localization.language.iso.code.hint": "رمز لغة ISO 639-1 (مثل، en، ar، fr)",
  "localization.placeholder.name": "English",
  "localization.placeholder.native.name": "English",
  "localization.language.native.name.hint":
    "الاسم باللغة الأصلية (مثل، العربية للعربية)",
  "localization.language.display.order": "ترتيب العرض",
  "localization.language.direction.ltr": "من اليسار إلى اليمين (LTR)",
  "localization.language.direction.rtl": "من اليمين إلى اليسار (RTL)",
  "localization.validation.code.required": "رمز اللغة مطلوب",
  "localization.validation.code.max.length":
    "يجب أن يكون رمز اللغة 10 أحرف على الأكثر",
  "localization.validation.name.required": "اسم اللغة مطلوب",
  "localization.validation.name.max.length":
    "يجب أن يكون اسم اللغة 100 حرف على الأكثر",

  "localization.key.title": "مفاتيح الترجمة",
  "localization.key.subtitle": "إدارة مفاتيح الترجمة لتطبيقك",
  "localization.key.new": "إضافة مفتاح",
  "localization.key.filter.module": "التصفية حسب الوحدة",
  "localization.key.module": "الوحدة",
  "localization.key.name": "اسم المفتاح",
  "localization.key.default.message": "الرسالة الافتراضية",
  "localization.key.translations": "الترجمات",
  "localization.key.empty": "لم يتم العثور على مفاتيح ترجمة",
  "localization.key.delete.title": "حذف مفتاح الترجمة",

  "localization.key.edit": "تعديل المفتاح",
  "localization.key.about": "معلومات المفتاح",
  "localization.placeholder.key.name": "button.submit",
  "localization.key.select.module": "اختر أو أدخل وحدة",
  "localization.placeholder.default.message":
    "أدخل القيمة الافتراضية (بالإنجليزية)",
  "localization.key.description": "الوصف",
  "localization.placeholder.key.description": "وصف اختياري للمترجمين",
  "localization.key.variables": "المتغيرات",
  "localization.key.variables.placeholder": "مثل، name، count، date",
  "localization.key.variables.hint":
    "أدخل أسماء المتغيرات المستخدمة في هذه الترجمة",
  "localization.key.translations.section": "الترجمات",
  "localization.key.no.languages": "لا توجد لغات نشطة مُعدّة",
  "localization.key.enter.translation": "أدخل الترجمة",
  "localization.validation.key.required": "مفتاح الترجمة مطلوب",
  "localization.validation.default.message.required":
    "الرسالة الافتراضية مطلوبة",
};

// ============================================================================
// DEFAULT LANGUAGES
// ============================================================================
interface LanguageDefinition {
  code: string;
  name: string;
  nativeName: string;
  direction: "ltr" | "rtl";
  isDefault: boolean;
  serial: number;
}

const DEFAULT_LANGUAGES: LanguageDefinition[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    direction: "ltr",
    isDefault: true,
    serial: 1,
  },
  {
    code: "bn",
    name: "Bengali",
    nativeName: "বাংলা",
    direction: "ltr",
    isDefault: false,
    serial: 2,
  },
  {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    direction: "rtl",
    isDefault: false,
    serial: 3,
  },
];

// ============================================================================
// LANGUAGE-SPECIFIC TRANSLATION MAPS
// Maps language code to its translation record
// ============================================================================
const LANGUAGE_TRANSLATIONS: Record<string, Record<string, string>> = {
  ar: ARABIC_TRANSLATIONS,
  bn: BENGALI_TRANSLATIONS,
};

// ============================================================================
// SEED FUNCTION
// ============================================================================
async function seedLocalization(): Promise<void> {
  console.log("🌍 Starting localization seed...\n");
  console.log(`📋 Configuration:`);
  console.log(`   - enableStorage: ${ENABLE_STORAGE}`);
  console.log(`   - enableEmail: ${ENABLE_EMAIL}`);
  console.log(`   - enableFormBuilder: ${ENABLE_FORM_BUILDER}`);
  console.log(`   - enableEventManager: ${ENABLE_EVENT_MANAGER}`);
  console.log(`   - enableNotification: ${ENABLE_NOTIFICATION}`);
  console.log(`   - enableLocalization: ${ENABLE_LOCALIZATION}`);
  console.log("");

  const dataSource = new DataSource({
    type: migrationConfig.defaultDatabaseConfig.type as any,
    host: migrationConfig.defaultDatabaseConfig.host,
    port: migrationConfig.defaultDatabaseConfig.port,
    username: migrationConfig.defaultDatabaseConfig.username,
    password: migrationConfig.defaultDatabaseConfig.password,
    database: migrationConfig.defaultDatabaseConfig.database,
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  console.log("✓ Database connected\n");

  const dbType = (
    migrationConfig.defaultDatabaseConfig.type as string
  ).toLowerCase();
  const isPostgres = dbType === "postgres" || dbType === "postgresql";

  // Convert ? placeholders to $N for PostgreSQL; pass through for MySQL
  const q = (sql: string, params: any[]): [string, any[]] => {
    if (!isPostgres) return [sql, params];
    let idx = 0;
    return [sql.replace(/\?/g, () => `$${++idx}`), params];
  };

  // Quote a reserved SQL identifier (e.g. "key") for the active DB dialect
  const qid = (name: string): string =>
    isPostgres ? `"${name}"` : `\`${name}\``;

  // Boolean value: PostgreSQL BOOLEAN columns need true/false; MySQL uses 1/0
  const bv = (val: boolean): boolean | number =>
    isPostgres ? val : val ? 1 : 0;

  const queryRunner = dataSource.createQueryRunner();

  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    // 0. Clear all existing localization data
    console.log("🗑️  Clearing existing localization data...");
    await queryRunner.query(`DELETE FROM translation WHERE 1=1`);
    await queryRunner.query(`DELETE FROM translation_key WHERE 1=1`);
    await queryRunner.query(`DELETE FROM language WHERE 1=1`);
    console.log("   ✓ Cleared translations, keys, and languages\n");

    // 1. Seed Languages
    console.log("🌐 Seeding languages...");
    const languageIds: Record<string, string> = {};

    for (const lang of DEFAULT_LANGUAGES) {
      const existingLang = (
        await queryRunner.query(
          ...q(
            `SELECT id FROM language WHERE code = ? AND deleted_at IS NULL LIMIT 1`,
            [lang.code],
          ),
        )
      )[0];

      if (!existingLang) {
        const langId = uuidv4();
        await queryRunner.query(
          ...q(
            `INSERT INTO language (id, code, name, native_name, direction, is_active, is_default, serial, is_readonly)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              langId,
              lang.code,
              lang.name,
              lang.nativeName,
              lang.direction,
              bv(true),
              bv(lang.isDefault),
              lang.serial,
              bv(true),
            ],
          ),
        );
        languageIds[lang.code] = langId;
        console.log(`   ✓ Created language: ${lang.name} (${lang.code})`);
      } else {
        languageIds[lang.code] = existingLang.id;
        console.log(`   - Language exists: ${lang.name} (${lang.code})`);
      }
    }

    // 2. Seed Translation Keys (module-wise)
    console.log("\n📝 Seeding translation keys...");

    let totalKeysCreated = 0;
    let totalKeysExist = 0;
    let totalTranslationsCreated = 0;

    for (const moduleConfig of MODULE_CONFIGS) {
      if (!moduleConfig.enabled) {
        console.log(`\n   [Module] ${moduleConfig.name} - SKIPPED (disabled)`);
        continue;
      }

      if (Object.keys(moduleConfig.messages).length === 0) {
        continue;
      }

      console.log(`\n   [Module] ${moduleConfig.name}`);
      let moduleKeysCreated = 0;
      let moduleKeysExist = 0;

      for (const [key, defaultMessage] of Object.entries(
        moduleConfig.messages,
      )) {
        // Use the module from config, not key prefix (e.g., layout module contains menu.* keys)
        const keyModule = moduleConfig.name;

        // Check if key exists
        const existingKey = (
          await queryRunner.query(
            ...q(
              `SELECT id FROM translation_key WHERE ${qid("key")} = ? AND deleted_at IS NULL LIMIT 1`,
              [key],
            ),
          )
        )[0];

        let keyId: string;

        if (!existingKey) {
          keyId = uuidv4();
          // Extract variables from the message (e.g., {{name}}, {{count}})
          const variableMatches = defaultMessage.match(/\{\{(\w+)\}\}/g);
          const variables = variableMatches
            ? variableMatches.map((v) => v.replace(/\{\{|\}\}/g, ""))
            : null;

          await queryRunner.query(
            ...q(
              `INSERT INTO translation_key (id, module, ${qid("key")}, default_message, variables, is_active, is_readonly)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                keyId,
                keyModule,
                key,
                defaultMessage,
                variables
                  ? JSON.stringify(
                      Array.isArray(variables)
                        ? variables
                        : variables
                          ? [variables]
                          : [],
                    )
                  : null,
                bv(true),
                bv(moduleConfig.readOnly),
              ],
            ),
          );
          moduleKeysCreated++;
          totalKeysCreated++;
        } else {
          keyId = existingKey.id;
          // Update module if it's different (fix for keys with wrong module)
          await queryRunner.query(
            ...q(
              `UPDATE translation_key SET module = ? WHERE id = ? AND module != ?`,
              [keyModule, keyId, keyModule],
            ),
          );
          moduleKeysExist++;
          totalKeysExist++;
        }

        // Create translations for all languages
        for (const lang of DEFAULT_LANGUAGES) {
          const langId = languageIds[lang.code];
          if (!langId) continue;

          // Get translated value: English uses defaultMessage, others use translation maps
          let translatedValue = defaultMessage;
          if (lang.code !== "en") {
            const langTranslations = LANGUAGE_TRANSLATIONS[lang.code];
            if (langTranslations && langTranslations[key]) {
              translatedValue = langTranslations[key];
            }
          }

          const existingTranslation = (
            await queryRunner.query(
              ...q(
                `SELECT id, value FROM translation WHERE language_id = ? AND translation_key_id = ? AND deleted_at IS NULL LIMIT 1`,
                [langId, keyId],
              ),
            )
          )[0];

          if (!existingTranslation) {
            await queryRunner.query(
              ...q(
                `INSERT INTO translation (id, language_id, translation_key_id, value, is_verified, is_active)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                  uuidv4(),
                  langId,
                  keyId,
                  translatedValue,
                  bv(lang.code === "en"),
                  bv(true),
                ],
              ),
            );
            totalTranslationsCreated++;
          } else if (
            lang.code !== "en" &&
            existingTranslation.value !== translatedValue &&
            existingTranslation.value === defaultMessage
          ) {
            // Update non-English translations that still have English value
            await queryRunner.query(
              ...q(`UPDATE translation SET value = ? WHERE id = ?`, [
                translatedValue,
                existingTranslation.id,
              ]),
            );
            totalTranslationsCreated++; // Count as created for reporting
          }
        }
      }

      console.log(
        `      ✓ Created: ${moduleKeysCreated}, Existing: ${moduleKeysExist}`,
      );
    }

    await queryRunner.commitTransaction();

    // Summary
    console.log("\n" + "═".repeat(60));
    console.log("✅ Localization seed completed successfully!");
    console.log("═".repeat(60));
    console.log("\n📊 Summary:");
    console.log("─".repeat(40));
    console.log(`   Languages:          ${DEFAULT_LANGUAGES.length}`);
    console.log(`   Keys Created:       ${totalKeysCreated}`);
    console.log(`   Keys Existing:      ${totalKeysExist}`);
    console.log(`   Translations:       ${totalTranslationsCreated}`);
    console.log("─".repeat(40));
    console.log("\n💡 Modules seeded:");
    for (const config of MODULE_CONFIGS) {
      const status = config.enabled ? "✓" : "✗";
      const count = Object.keys(config.messages).length;
      console.log(
        `   ${status} ${config.name}: ${count} keys (is_readonly=${config.readOnly})`,
      );
    }
    console.log(
      "\n💡 Tip: Run this script again after adding new message keys.\n",
    );
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

// Run if called directly
seedLocalization().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
