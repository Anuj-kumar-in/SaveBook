"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth/authContext';
import { useRouter } from 'next/navigation';

// Patch: Import useContext and AuthContext to update user context
import { useContext } from 'react';
import AuthContext from '@/context/auth/authContext';

export default function ProfilePage() {
  const { user, loading, checkUserAuthentication } = useAuth();
  // Patch: Get setUser from AuthContext
  const authCtx = useContext(AuthContext);
  const router = useRouter();
  const [formData, setFormData] = useState({
    profileImage: '',
    firstName: '',
    lastName: '',
    bio: '',
    location: ''
  });
  const [imagePreview, setImagePreview] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        profileImage: user.profileImage || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        bio: user.bio || '',
        location: user.location || ''
      });
      setImagePreview(user.profileImage || '');
      setIsDataLoaded(true);
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    
    if (file) {
      // Validate file type
      if (!file.type.match('image.*')) {
        setError('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size exceeds 5MB limit');
        return;
      }
      setMessage('Uploading image...');
      const formData = new FormData();
      formData.append('image', file);
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        const result = await response.json();
        if (result.imageUrl) {
          setImagePreview(result.imageUrl);
          setFormData(prev => ({
            ...prev,
            profileImage: result.imageUrl
          }));
          setMessage('Image uploaded successfully!');
          setError('');
          setTimeout(() => setMessage(''), 2000);
        } else {
          setError(result.error || result.message || 'Failed to upload image');
        }
      } catch (err) {
        setError('An error occurred while uploading the image');
        console.error('Image upload error:', err);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileImage: formData.profileImage,
          firstName: formData.firstName,
          lastName: formData.lastName,
          bio: formData.bio,
          location: formData.location
        }),
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Profile updated successfully!');

        // Update form data to reflect the changes immediately
        setFormData({
          profileImage: data.user.profileImage,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          bio: data.user.bio,
          location: data.user.location
        });

        // Update image preview
        setImagePreview(data.user.profileImage);

        // Patch: Update user context immediately for instant UI reflection
        if (authCtx && typeof authCtx.setUser === 'function') {
          authCtx.setUser(prev => ({ ...prev, ...data.user }));
        }

        // Optionally, still refresh user data from the server
        if (checkUserAuthentication) {
          await checkUserAuthentication();
        }

        setTimeout(() => {
          setIsEditing(false);
        }, 500);

        setTimeout(() => {
          setMessage(''); // Clear message
        }, 2000);
      } else {
        setError(data.message || 'Failed to update profile');
      }
    } catch (err) {
      setError('An error occurred while updating profile');
      console.error('Profile update error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  if (loading || !isDataLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  const handleEditClick = () => {
    setIsEditing(true);
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form to current user data
    if (user) {
      setFormData({
        profileImage: user.profileImage || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        bio: user.bio || '',
        location: user.location || ''
      });
      setImagePreview(user.profileImage || '');
    }
  };
  
  return (
    <div className="min-h-screen bg-[color:var(--background)] py-12 flex items-center justify-center">
      <div className="w-full max-w-2xl px-2 sm:px-4 md:px-8">
        <div className="glass-panel border border-[var(--border)] rounded-3xl shadow-2xl overflow-hidden backdrop-blur-lg">
          <div className="p-6 md:p-10">
            <h1 className="text-3xl md:text-4xl font-extrabold text-center text-[color:var(--foreground)] mb-8 tracking-tight">Profile</h1>

            {/* Toast notifications - always bottom right, above all content */}
            <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-2">
              {message && (
                <div className="pointer-events-auto min-w-[220px] px-5 py-3 bg-green-500 text-white rounded-xl shadow-2xl font-semibold text-base animate-fade-in">
                  {message}
                </div>
              )}
              {error && (
                <div className="pointer-events-auto min-w-[220px] px-5 py-3 bg-red-500 text-white rounded-xl shadow-2xl font-semibold text-base animate-fade-in">
                  {error}
                </div>
              )}
            </div>

            {!isEditing ? (
              <div className="space-y-8">
                {/* Profile Card Modernized */}
                <div className="rounded-2xl glass-panel border border-[var(--border)] p-8 flex flex-col items-center gap-6 shadow-xl">
                  <div className="relative flex flex-col items-center gap-2">
                    <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 border-4 border-[var(--border)] shadow-lg overflow-hidden flex items-center justify-center">
                      {user?.profileImage ? (
                        <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl md:text-5xl font-bold text-white select-none">
                          {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>
                    <h3 className="text-2xl font-bold text-[color:var(--foreground)] mt-2">{user?.username || 'N/A'}</h3>
                  </div>
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-[color:var(--muted)] tracking-wider mb-1">Full Name</h4>
                      <p className="text-lg font-medium text-[color:var(--foreground)]">
                        {(user?.firstName || user?.lastName) ? `${user?.firstName || ''} ${user?.lastName || ''}` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-[color:var(--muted)] tracking-wider mb-1">Location</h4>
                      <p className="text-lg font-medium text-[color:var(--foreground)]">{user?.location || 'N/A'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <h4 className="text-xs font-semibold uppercase text-[color:var(--muted)] tracking-wider mb-1">Bio</h4>
                      <p className="text-base text-[color:var(--foreground)] min-h-[2.5rem]">{user?.bio || 'N/A'}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleEditClick}
                    className="mt-4 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
                  >
                    <span className="inline-flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Profile
                    </span>
                  </button>
                </div>
              </div>
            ) : isDataLoaded ? (
              <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col items-center mb-8">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full bg-gray-200 border-4 border-white dark:border-gray-700 shadow-lg overflow-hidden">
                    {imagePreview ? (
                      <img 
                        src={imagePreview} 
                        alt="Profile Preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                        <span className="text-4xl">
                          {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors shadow-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Username
                  </label>
                  <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {user?.username || 'N/A'}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter first name"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={formData.bio || ''}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Tell us about yourself"
                  ></textarea>
                </div>
                
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter your location"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  Update Profile
                </button>
              </div>
            </form>
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}