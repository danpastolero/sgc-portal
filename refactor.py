import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    # Update imports
    if "import SettingsPage from './Settings'" in line:
        new_lines.append("import SettingsPage from './pages/Settings'\n")
        continue
    if "import TextExtractor from './TextExtractor'" in line:
        new_lines.append("import TextExtractor from './pages/TextExtractor'\n")
        continue
    if "import PdfEditor from './PdfEditor'" in line:
        new_lines.append("import PdfEditor from './pages/PdfEditor'\n")
        new_lines.append("import Dashboard from './pages/Dashboard'\n")
        new_lines.append("import Directory from './pages/Directory'\n")
        new_lines.append("import Audit from './pages/Audit'\n")
        new_lines.append("import Classifications from './pages/Classifications'\n")
        new_lines.append("import Users from './pages/Users'\n")
        continue

    # Remove render functions
    if "const renderDashboard = () => (" in line:
        skip = True
    
    if skip:
        # Check if we are at the end of the render functions
        # The line before `return (` is `  )` from renderUsers
        if "return (" in line and "layout-container" in lines[i+1]:
            skip = False
        else:
            continue

    # Update render calls
    if "activeTab === 'dashboard' ? renderDashboard() :" in line:
        new_lines.append("          activeTab === 'dashboard' ? <Dashboard stats={stats} systems={systems} setActiveTab={setActiveTab} /> :\n")
        continue
    if "activeTab === 'directory' ? renderDirectory() :" in line:
        new_lines.append("            activeTab === 'directory' ? <Directory searchQuery={searchQuery} setSearchQuery={setSearchQuery} filteredSystems={filteredSystems} handleOpenEditSystem={handleOpenEditSystem} handleDeleteSystem={handleDeleteSystem} /> :\n")
        continue
    if "activeTab === 'audit' ? renderAudit() :" in line:
        new_lines.append("              activeTab === 'audit' ? <Audit auditLogs={auditLogs} /> :\n")
        continue
    if "activeTab === 'users' ? renderUsers() :" in line:
        new_lines.append("                activeTab === 'users' ? <Users users={users} /> :\n")
        continue
    if "activeTab === 'classifications' ? renderClassifications() :" in line:
        new_lines.append("                  activeTab === 'classifications' ? <Classifications categories={categories} departments={departments} setShowCatModal={setShowCatModal} setShowDeptModal={setShowDeptModal} editingCategory={editingCategory} setEditingCategory={setEditingCategory} editingDepartment={editingDepartment} setEditingDepartment={setEditingDepartment} handleUpdateCategory={handleUpdateCategory} handleDeleteCategory={handleDeleteCategory} handleUpdateDepartment={handleUpdateDepartment} handleDeleteDepartment={handleDeleteDepartment} /> :\n")
        continue
        
    new_lines.append(line)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
