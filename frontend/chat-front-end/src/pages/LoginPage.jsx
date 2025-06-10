// src/pages/LoginPage.jsx
import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Eye, EyeOff, Loader2 } from "lucide-react"; // Corrected icon imports
import { Link } from "react-router-dom";

// A simple component for the Google icon
const GoogleIcon = () => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		viewBox='0 0 48 48'
		width='24px'
		height='24px'
	>
		<path
			fill='#FFC107'
			d='M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12
			s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24
			s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z'
		/>
		<path
			fill='#FF3D00'
			d='M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657
			C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z'
		/>
		<path
			fill='#4CAF50'
			d='M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36
			c-5.223,0-9.657-3.657-11.303-8H6.306C9.656,39.663,16.318,44,24,44z'
		/>
		<path
			fill='#1976D2'
			d='M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571
			l6.19,5.238C44.434,36.338,48,31.018,48,24C48,22.659,47.862,21.35,47.611,20.083z'
		/>
	</svg>
);

const LoginPage = () => {
	const [showPassword, setShowPassword] = useState(false);
	const [formData, setFormData] = useState({
		email: "",
		password: "",
	});
	const { login, isLoggingIn } = useAuthStore();

	const handleSubmit = async (e) => {
		e.preventDefault();
		login(formData);
	};

	return (
		<div
			className='min-h-screen flex items-center justify-center p-4 bg-cover bg-center'
			// IMPORTANT: Replace this URL with your own background image
			style={{
				backgroundImage:
					" linear-gradient(rgba(251, 251, 251, 0.5), rgba(255, 255, 255, 0.5)),url('https://images.pexels.com/photos/2036686/pexels-photo-2036686.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')",
			}}
		>
			{/* Logo Placeholder */}
			<div className='absolute top-8 left-15 flex items-center gap-'>
					
					<img src="/logo.svg" alt="Your Brand Logo" className="w-25 h-25" />
				
			</div>

			<div className='w-full max-w-md bg-white p-8 rounded-2xl shadow-xl space-y-6'>
				{/* Header */}
				<div className='text-center'>
					<h1 className='text-3xl font-bold text-gray-800'>Log In</h1>
					<p className='text-gray-500 mt-2'>Welcome back, please enter your details.</p>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className='space-y-4'>
					<div className='form-control'>
						<label className='label'>
							<span className='label-text font-medium'>Email</span>
						</label>
						<input
							type='email'
							className='input input-bordered w-full'
							placeholder='you@example.com'
							value={formData.email}
							onChange={(e) =>
								setFormData({ ...formData, email: e.target.value })
							}
						/>
					</div>

					<div className='form-control'>
						<div className='flex justify-between items-center'>
							<label className='label'>
								<span className='label-text font-medium'>Password</span>
							</label>
							
						</div>
						<div className='relative'>
							<input
								type={showPassword ? "text" : "password"}
								className='input input-bordered w-full pr-10' // Added pr-10 for icon space
								placeholder='Enter your password'
								value={formData.password}
								onChange={(e) =>
									setFormData({ ...formData, password: e.target.value })
								}
							/>
							<button
								type='button'
								className='absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600'
								onClick={() => setShowPassword(!showPassword)}
							>
								{showPassword ? (
									<Eye className='h-5 w-5' />
								) : (
									<EyeOff className='h-5 w-5' />
								)}
							</button>
						</div>
					</div>

<div className='relative flex items-center py-2'>

				</div>
					<button type='submit' className='btn btn-primary w-full' disabled={isLoggingIn}>
						{isLoggingIn ? (
							<>
								<Loader2 className='h-5 w-5 animate-spin' />
								Logging in...
							</>
						) : (
							"Log In"
						)}
					</button>
				</form>

				{/* Separator */}
				<div className='relative flex items-center py-2'>

				</div>
			</div>
		</div>
	);
};

export default LoginPage;