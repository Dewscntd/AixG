# AixG Build Fix Plan - Comprehensive TypeScript Error Resolution

## 📊 Error Analysis Summary

Based on the build output, we have **200+ TypeScript errors** across the following categories:

### Error Categories:
1. **Missing Module Imports** (40+ errors)
2. **Type Definition Issues** (60+ errors) 
3. **Property Initialization Problems** (30+ errors)
4. **Interface Compatibility Issues** (25+ errors)
5. **Missing Services/Dependencies** (20+ errors)
6. **Configuration Issues** (15+ errors)
7. **Event System Problems** (10+ errors)

---

## 🎯 Phase-by-Phase Fix Plan

### **Phase 1: Fix Missing Imports and Dependencies** 
**Priority**: Critical | **Estimated Time**: 30 minutes

#### 1.1 Core Infrastructure Missing
- [ ] Create missing `aggregate-root.ts` base class
- [ ] Create missing `prisma.service.ts` 
- [ ] Create missing `event-store.module.ts`
- [ ] Install missing `@nestjs/cqrs` dependency
- [ ] Install missing `@nestjs/typeorm` dependency

#### 1.2 Service Dependencies  
- [ ] Fix import paths for shared modules
- [ ] Create missing event classes
- [ ] Fix circular dependency issues

**Files to Fix**: 
- `src/ai-coaching/domain/entities/coaching-session.aggregate.ts`
- `src/team-management-service/infrastructure/repositories/*.ts`
- All files with missing `@nestjs/cqrs` imports

---

### **Phase 2: Fix Type Definition Errors**
**Priority**: High | **Estimated Time**: 45 minutes

#### 2.1 Interface Compatibility Issues
- [ ] Fix `CoachProfile` interface - add missing `id` property
- [ ] Fix `MatchContext` interface - add `matchMinute`, `scoreline` properties
- [ ] Fix `ResponseFormat` enum - add missing values
- [ ] Fix `ActionableRecommendation` interface structure

#### 2.2 Type Union Issues
- [ ] Fix coaching insight type unions
- [ ] Fix tactical analysis enum values
- [ ] Fix priority level enums

**Files to Fix**:
- `src/ai-coaching/domain/value-objects/*.ts`
- `src/ai-coaching/application/services/real-time-coaching.service.ts`

---

### **Phase 3: Fix Property Initialization Issues**
**Priority**: High | **Estimated Time**: 30 minutes  

#### 3.1 Constructor Dependency Injection
- [ ] Fix `RealTimeCoachingService` constructor injection
- [ ] Fix all services with uninitialized properties
- [ ] Add proper DI decorators

#### 3.2 Optional Properties
- [ ] Fix `exactOptionalPropertyTypes` issues in `team-colors.vo.ts`
- [ ] Fix undefined property assignments
- [ ] Add proper null checks

**Files to Fix**:
- `src/ai-coaching/application/services/real-time-coaching.service.ts`
- `src/team-management-service/domain/value-objects/team-colors.vo.ts`

---

### **Phase 4: Fix Interface Compatibility Issues**
**Priority**: Medium | **Estimated Time**: 25 minutes

#### 4.1 Event System Compatibility
- [ ] Fix domain event base classes
- [ ] Fix event handler interfaces  
- [ ] Fix CQRS command/query structures

#### 4.2 Repository Patterns
- [ ] Fix repository interface implementations
- [ ] Fix Prisma integration patterns
- [ ] Add proper error handling types

**Files to Fix**:
- All domain event files
- Repository implementation files

---

### **Phase 5: Create Missing Modules and Services**
**Priority**: Medium | **Estimated Time**: 40 minutes

#### 5.1 Missing Infrastructure
- [ ] Create `prisma.service.ts` and `prisma.module.ts`
- [ ] Create base `aggregate-root.ts` class
- [ ] Create missing event store infrastructure

#### 5.2 Missing Domain Events
- [ ] Create `tactical-analysis-requested.event.ts`
- [ ] Create `training-plan-generated.event.ts`  
- [ ] Create `coaching-session-started.event.ts`
- [ ] Create other missing event classes

#### 5.3 Missing Value Objects/Entities
- [ ] Create missing training plan entities
- [ ] Fix import paths for existing entities

**New Files to Create**:
- `src/shared/infrastructure/prisma/prisma.service.ts`
- `src/shared/infrastructure/prisma/prisma.module.ts`
- `src/shared/domain/base/aggregate-root.ts`
- Missing event files in `src/ai-coaching/domain/events/`

---

### **Phase 6: Verify Build Success** 
**Priority**: Low | **Estimated Time**: 15 minutes

#### 6.1 Build Verification
- [ ] Run `npm run build` and check for remaining errors
- [ ] Fix any remaining compilation issues
- [ ] Run frontend build: `npm run build:frontend`

#### 6.2 Type Checking
- [ ] Run `npm run type-check` 
- [ ] Verify all type errors are resolved
- [ ] Check for any linting issues

---

## 🔧 Implementation Strategy

### Step-by-Step Execution:
1. **Start with Phase 1** - Fix critical infrastructure issues first
2. **Progress through phases sequentially** - Each phase builds on the previous
3. **Test after each phase** - Run partial builds to verify fixes
4. **Document any new patterns** - Update project documentation as needed

### Key Principles:
- **Maintain Domain-Driven Design** patterns
- **Preserve existing architecture** - don't break working code
- **Follow TypeScript strict mode** requirements
- **Ensure proper dependency injection** setup

### Risk Mitigation:
- **Create backup of working files** before major changes
- **Fix one service at a time** to isolate issues
- **Test incrementally** rather than waiting for full completion

---

## 📋 Success Criteria

### Phase Completion Criteria:
- ✅ **Phase 1**: No missing module/import errors
- ✅ **Phase 2**: All type definitions match interfaces
- ✅ **Phase 3**: All properties properly initialized
- ✅ **Phase 4**: All interfaces compatible
- ✅ **Phase 5**: All missing files created
- ✅ **Phase 6**: `npm run build` succeeds with 0 errors

### Final Success Metrics:
- [ ] **0 TypeScript compilation errors**
- [ ] **Frontend builds successfully**
- [ ] **All services properly typed**
- [ ] **DI container resolves all dependencies**
- [ ] **All domain patterns maintained**

---

## 🎯 Execution Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1 | 30 min | None |
| Phase 2 | 45 min | Phase 1 |  
| Phase 3 | 30 min | Phase 1-2 |
| Phase 4 | 25 min | Phase 1-3 |
| Phase 5 | 40 min | Phase 1-4 |
| Phase 6 | 15 min | All phases |

**Total Estimated Time**: ~3 hours

---

*Plan created: January 2025*
*Target: Zero TypeScript compilation errors*