-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('manager', 'employee');

-- Create task status enum
CREATE TYPE public.task_status AS ENUM ('not_started', 'in_progress', 'finished');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  title TEXT,
  role user_role NOT NULL DEFAULT 'employee',
  position TEXT,
  details TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status task_status NOT NULL DEFAULT 'not_started',
  start_date DATE NOT NULL,
  deadline_date DATE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task history table for tracking status changes
CREATE TABLE public.task_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  old_status task_status,
  new_status task_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Managers can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'manager'
  )
);

CREATE POLICY "Managers can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'manager'
  )
);

-- Create policies for tasks
CREATE POLICY "Users can view their own tasks or managers can view all" 
ON public.tasks 
FOR SELECT 
USING (
  assigned_to = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'manager'
  )
);

CREATE POLICY "Managers can insert tasks" 
ON public.tasks 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'manager'
  )
);

CREATE POLICY "Managers can update tasks or employees can update their own status" 
ON public.tasks 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'manager'
  )
  OR (
    assigned_to = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- Create policies for task history
CREATE POLICY "Users can view task history for their tasks or managers can view all" 
ON public.task_history 
FOR SELECT 
USING (
  task_id IN (
    SELECT id FROM public.tasks 
    WHERE assigned_to = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'manager'
  )
);

CREATE POLICY "All authenticated users can insert task history" 
ON public.task_history 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to log task status changes
CREATE OR REPLACE FUNCTION public.log_task_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.task_history (task_id, old_status, new_status, changed_by)
    VALUES (
      NEW.id, 
      OLD.status, 
      NEW.status, 
      (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    );
    
    -- Set completed_at timestamp when task is finished
    IF NEW.status = 'finished' THEN
      NEW.completed_at = now();
    ELSIF NEW.status != 'finished' THEN
      NEW.completed_at = NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for task status changes
CREATE TRIGGER log_task_status_change_trigger
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.log_task_status_change();

-- Insert default users
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
VALUES 
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin@company.com',
    crypt('admin110022', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"username": "admin"}'
  ),
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    'test@company.com',
    crypt('test123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"username": "test"}'
  );

-- Insert corresponding profiles
INSERT INTO public.profiles (user_id, username, full_name, title, role, position, details)
VALUES 
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin',
    'Administrator',
    'System Administrator',
    'manager',
    'Senior Manager',
    'System administrator with full access'
  ),
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    'test',
    'Test Employee',
    'Software Developer',
    'employee',
    'Junior Developer',
    'Test employee account'
  );