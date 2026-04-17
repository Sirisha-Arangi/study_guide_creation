import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  HelpCircle,
  BookOpen,
  Search,
  GitCompare,
  ClipboardList,
  BarChart3,
  ClipboardCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
}

const sidebarItems: SidebarItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Summarization', path: '/summarization', icon: FileText },
  { name: 'Flashcards', path: '/flashcards', icon: CreditCard },
  { name: 'Question & Answers', path: '/qa', icon: HelpCircle },
  { name: 'Lecture Plan', path: '/lecture-plan', icon: BookOpen },
  { name: 'Content Gap Detector', path: '/content-gap', icon: Search },
  { name: 'Document Comparison', path: '/document-comparison', icon: GitCompare },
  { name: 'Assignment Generator', path: '/assignment-generator', icon: ClipboardList },
  { name: 'Exam Submissions', path: '/teacher-submissions', icon: ClipboardCheck },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const itemsToRender = isTeacher
    ? sidebarItems
    : [
        { name: 'Student Exams', path: '/student-exams', icon: ClipboardList },
        { name: 'View Results', path: '/student-results', icon: BarChart3 },
      ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:inset-0
        `}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 lg:hidden">
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-5 px-2">
          <div className="space-y-1">
            {itemsToRender.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => onClose()}
                  className={`
                    sidebar-item group
                    ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}
                  `}
                >
                  <Icon
                    className={`
                      mr-3 h-5 w-5 flex-shrink-0
                      ${isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}
                    `}
                  />
                  {item.name}
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
